import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { read, utils } from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the form data (which includes the file)
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return Response.json({ 
        success: false, 
        message: 'No file uploaded' 
      }, { status: 400 });
    }

    // Read the file content
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse the Excel file
    const workbook = read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = utils.sheet_to_json(worksheet);

    // Validate the data structure
    if (!jsonData || jsonData.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'Excel file is empty or invalid' 
      }, { status: 400 });
    }

    // Transform the data to match our database schema
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
    const { data, error } = await supabase
      .from('awardees')
      .upsert(awardeesToInsert, {
        onConflict: 'slug', // Update if slug already exists, otherwise insert
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Error importing awardees:', error);
      return Response.json({ 
        success: false, 
        message: 'Failed to import awardees',
        error: error.message 
      }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      message: `Successfully imported ${awardeesToInsert.length} awardees`,
      count: awardeesToInsert.length,
      data: data // Include the inserted data in the response
    });
  } catch (error) {
    console.error('Error in awardees import:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to import awardees',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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