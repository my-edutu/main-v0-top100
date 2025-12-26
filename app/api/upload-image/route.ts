import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api/require-admin';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Check if user is admin
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const awardeeId = formData.get('awardee_id') as string;

    if (!imageFile || imageFile.size === 0) {
      return Response.json({
        success: false,
        message: 'No image file provided'
      }, { status: 400 });
    }

    // Use service role client for storage operations
    const supabase = createAdminClient();

    // Generate a unique filename
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${awardeeId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('awardees')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      });

    if (uploadError) {
      console.error('Error uploading image to Supabase:', uploadError);
      return Response.json({
        success: false,
        message: 'Failed to upload image',
        error: uploadError.message
      }, { status: 500 });
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('awardees')
      .getPublicUrl(uploadData.path);

    return Response.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: publicUrlData.publicUrl
    });
  } catch (error) {
    console.error('Error in upload-image API:', error);
    return Response.json({
      success: false,
      message: 'Failed to upload image',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

