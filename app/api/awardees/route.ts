// app/api/awardees/route.ts
import { NextRequest } from 'next/server';

import { promises as fs } from 'fs';
import path from 'path';

import { requireAdmin } from '@/lib/api/require-admin';
import { createClient } from '@/lib/supabase/server';
import { read, utils } from 'xlsx';

type AwardeeRecord = {
  id: string;
  profile_id?: string | null;
  name?: string | null;
  country?: string | null;
  course?: string | null;
  bio?: string | null;
  email?: string | null;
  image_url?: string | null;
  slug?: string | null;
};

const syncProfileFromAwardee = async (supabase: ReturnType<typeof createClient>, awardeeId: string) => {
  const { data: awardee } = await supabase
    .from('awardees')
    .select('id, profile_id, name, country, course, bio, email, image_url, slug')
    .eq('id', awardeeId)
    .maybeSingle<AwardeeRecord>();

  if (!awardee?.profile_id) {
    return;
  }

  await supabase
    .from('profiles')
    .update({
      full_name: awardee.name ?? undefined,
      location: awardee.country ?? undefined,
      field_of_study: awardee.course ?? undefined,
      bio: awardee.bio ?? undefined,
      email: awardee.email ?? undefined,
      avatar_url: awardee.image_url ?? undefined,
      slug: awardee.slug ?? undefined,
      metadata: {},
    })
    .eq('id', awardee.profile_id);
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(true); // Use service role for admin operations
    
    // Check if there are any awardees in the database
    const { count, error: countError } = await supabase
      .from('awardees')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting awardees:', countError);
    }
    
    // If no awardees exist in the database, try to initialize from the Excel file
    if (!countError && count === 0) {
      await initializeAwardeesFromExcel();
    }
    
    // Fetch awardees from the database
    const { data, error } = await supabase
      .from('awardees')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching awardees:', error);
      return Response.json({ 
        success: false, 
        message: 'Failed to fetch awardees',
        error: error.message 
      }, { status: 500 });
    }
    
    return Response.json(data);
  } catch (error) {
    console.error('Error in awardees GET:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch awardees',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    let body;
    const contentType = request.headers.get('content-type');
    
    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle file upload via FormData
      const formData = await request.formData();
      
      body = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        country: formData.get('country') as string,
        cgpa: formData.get('cgpa') as string,
        course: formData.get('course') as string,
        bio: formData.get('bio') as string,
        year: formData.get('year') ? parseInt(formData.get('year') as string) : 2024,
        image: formData.get('image') as File | null,
        slug: formData.get('slug') as string,
      };
      
      // Validate required fields
      if (!body.name) {
        return Response.json({ 
          success: false, 
          message: 'Name is required' 
        }, { status: 400 });
      }
      
      // If there's an image file, upload it to Supabase storage
      let imageUrl = null;
      if (body.image && body.image.size > 0) {
        const supabase = createClient(true); // Use service role for admin operations
        
        // Generate a unique filename
        const fileName = `${Date.now()}-${body.image.name}`;
        
        try {
          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('awardees') // Use 'awardees' bucket, make sure this bucket exists in Supabase
            .upload(fileName, body.image, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            // Don't fail the entire request if image upload fails, just continue without image
            console.warn('Image upload failed, proceeding without image:', uploadError.message);
          } else {
            // Get the public URL of the uploaded image
            const { data: publicUrlData } = supabase.storage
              .from('awardees')
              .getPublicUrl(uploadData.path);
              
            imageUrl = publicUrlData.publicUrl;
          }
        } catch (storageError) {
          console.error('Unexpected error during image upload:', storageError);
          // Don't fail the entire request if image upload fails
          console.warn('Image upload failed due to unexpected error, proceeding without image');
        }
      }
      
      const supabase = createClient(true); // Use service role for admin operations
      
      // Check if an awardee with the same slug already exists
      const { data: existingAwardee } = await supabase
        .from('awardees')
        .select('id')
        .eq('slug', body.slug)
        .single();
      
      if (existingAwardee) {
        return Response.json({ 
          success: false, 
          message: 'An awardee with this name already exists' 
        }, { status: 409 }); // 409 Conflict
      }
      
      const { data, error } = await supabase
        .from('awardees')
        .insert([{
          name: body.name,
          email: body.email || null,
          country: body.country || null,
          cgpa: body.cgpa || null,
          course: body.course || null,
          bio: body.bio || null,
          year: body.year || 2024,
          image_url: imageUrl,
          slug: body.slug
        }])
        .select()
        .single();

      if (!error && data) {
        await syncProfileFromAwardee(supabase, data.id);
      }
      
      if (error) {
        console.error('Error adding awardee:', error);
        // Check if the error is related to a unique constraint violation
        if (error.code === '23505') { // PostgreSQL unique violation code
          return Response.json({ 
            success: false, 
            message: 'An awardee with this information already exists' 
          }, { status: 409 });
        }
        return Response.json({ 
          success: false, 
          message: 'Failed to add awardee',
          error: error.message 
        }, { status: 500 });
      }
      
      return Response.json({ 
        success: true, 
        message: 'Awardee added successfully',
        awardee: data
      });
    } else {
      // Handle JSON request (for requests without files)
      body = await request.json();
      
      // Validate required fields
      if (!body.name) {
        return Response.json({ 
          success: false, 
          message: 'Name is required' 
        }, { status: 400 });
      }

      const supabase = createClient(true); // Use service role for admin operations
      
      // Check if an awardee with the same slug already exists
      const { data: existingAwardee } = await supabase
        .from('awardees')
        .select('id')
        .eq('slug', generateSlug(body.name))
        .single();
      
      if (existingAwardee) {
        return Response.json({ 
          success: false, 
          message: 'An awardee with this name already exists' 
        }, { status: 409 }); // 409 Conflict
      }
      
      const { data, error } = await supabase
        .from('awardees')
        .insert([{
          name: body.name,
          email: body.email || null,
          country: body.country || null,
          cgpa: body.cgpa || null,
          course: body.course || null,
          bio: body.bio || null,
          year: body.year || 2024,
          image_url: body.image_url || null,
          slug: generateSlug(body.name)
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding awardee:', error);
        // Check if the error is related to a unique constraint violation
        if (error.code === '23505') { // PostgreSQL unique violation code
          return Response.json({ 
            success: false, 
            message: 'An awardee with this information already exists' 
          }, { status: 409 });
        }
        return Response.json({ 
          success: false, 
          message: 'Failed to add awardee',
          error: error.message 
        }, { status: 500 });
      }
      
      return Response.json({ 
        success: true, 
        message: 'Awardee added successfully',
        awardee: data
      });
    }
  } catch (error) {
    console.error('Error in awardees POST:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to add awardee',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const body = await request.json();
    
    if (!body.id) {
      return Response.json({ 
        success: false, 
        message: 'Awardee ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(true); // Use service role for admin operations
    
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.country !== undefined) updateData.country = body.country || null;
    if (body.cgpa !== undefined) updateData.cgpa = body.cgpa || null;
    if (body.course !== undefined) updateData.course = body.course || null;
    if (body.bio !== undefined) updateData.bio = body.bio || null;
    if (body.year !== undefined) updateData.year = body.year || 2024;
    if (body.image_url !== undefined) updateData.image_url = body.image_url || null;
    if (body.slug !== undefined) updateData.slug = body.slug || (body.name ? generateSlug(body.name) : undefined);
    if (body.is_public !== undefined) updateData.is_public = body.is_public;
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url || null;
    if (body.tagline !== undefined) updateData.tagline = body.tagline || null;
    if (body.headline !== undefined) updateData.headline = body.headline || null;
    if (body.social_links !== undefined) updateData.social_links = body.social_links || {};
    if (body.achievements !== undefined) updateData.achievements = body.achievements || [];
    if (body.interests !== undefined) updateData.interests = body.interests || [];

    const { data, error } = await supabase
      .from('awardees')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (!error && data) {
      await syncProfileFromAwardee(supabase, data.id);
    }
    
    if (error) {
      console.error('Error updating awardee:', error);
      return Response.json({ 
        success: false, 
        message: 'Failed to update awardee',
        error: error.message 
      }, { status: 500 });
    }
    
    return Response.json({ 
      success: true, 
      message: 'Awardee updated successfully',
      awardee: data
    });
  } catch (error) {
    console.error('Error in awardees PUT:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to update awardee',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return Response.json({ 
        success: false, 
        message: 'Awardee ID is required' 
      }, { status: 400 });
    }
    
    const supabase = createClient(true); // Use service role for admin operations
    
    const { error } = await supabase
      .from('awardees')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting awardee:', error);
      return Response.json({ 
        success: false, 
        message: 'Failed to delete awardee',
        error: error.message 
      }, { status: 500 });
    }
    
    return Response.json({ 
      success: true, 
      message: 'Awardee deleted successfully'
    });
  } catch (error) {
    console.error('Error in awardees DELETE:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to delete awardee',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Initialize awardees from the Excel file
async function initializeAwardeesFromExcel() {
  try {
    const supabase = createClient(true); // Use service role for admin operations
    
    // Try to fetch the Excel file from public directory
    // If running in development, fetch using a relative path
    // If running in production, use the full path
    const excelPath = path.join(process.cwd(), 'public', 'top100 Africa future Leaders 2025.xlsx');

    const buffer = await fs.readFile(excelPath).catch((error: unknown) => {
      console.warn(`Excel file not found at ${excelPath}, skipping initialization`, error);
      return null;
    });

    if (!buffer) {
      return;
    }

    const workbook = read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = utils.sheet_to_json(worksheet);
    
    if (!jsonData || jsonData.length === 0) {
      console.warn('Excel file is empty, skipping initialization');
      return;
    }
    
    // Process the Excel data to match our schema
    const awardeesToInsert = jsonData.map((row: any, index: number) => {
      // Normalize keys to handle different possible column names
      const normalizeKey = (obj: any, keyVariants: string[]): any => {
        for (const variant of keyVariants) {
          const foundKey = Object.keys(obj).find(k => 
            k.toLowerCase().replace(/\s+/g, '').includes(variant.toLowerCase().replace(/\s+/g, ''))
          );
          if (foundKey && obj[foundKey]) {
            return obj[foundKey];
          }
        }
        return null;
      };

      // Extract country name properly - remove abbreviations like "NG Nigeria", keep only "Nigeria"
      let country = normalizeKey(row, ['country', 'nationality']) || '';
      if (country && typeof country === 'string' && country.includes(' ')) {
        // If it looks like "XX CountryName", extract just the country name
        const parts = country.split(' ');
        if (parts.length >= 2 && parts[0].length === 2) { // Two-letter abbreviation
          country = parts.slice(1).join(' '); // Take everything after the abbreviation
        }
      }
      
      // Extract year properly
      let year = normalizeKey(row, ['year', 'batch']);
      if (typeof year === 'string') {
        year = parseInt(year);
      }

      return {
        id: row.id || `awardee-${index + 1}`,
        name: normalizeKey(row, ['name', 'fullname', 'awardee']) || `Awardee ${index + 1}`,
        email: normalizeKey(row, ['email', 'mail', 'e-mail']) || null,
        country: country || null,
        cgpa: normalizeKey(row, ['cgpa', 'gpa', 'grade']) || null,
        course: normalizeKey(row, ['course', 'program', 'department']) || null,
        bio: normalizeKey(row, ['bio', 'description', 'about', 'leadership', 'bio30']) || null,
        year: year ? parseInt(year.toString()) : 2024,
        slug: generateSlug(normalizeKey(row, ['name', 'fullname', 'awardee']) || `Awardee ${index + 1}`)
      };
    });

    // Insert the data into Supabase
    const { error } = await supabase
      .from('awardees')
      .insert(awardeesToInsert)
      .select();
    
    if (error) {
      console.error('Error initializing awardees from Excel:', error);
      throw error;
    }
    
    console.log(`Successfully initialized ${awardeesToInsert.length} awardees from Excel`);
  } catch (error) {
    console.error('Error during Excel initialization:', error);
  }
}

// Helper function to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
