import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase environment variables are missing, image download/upload functions will not work');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Downloads an image from a URL and uploads it to Supabase storage
 * @param imageUrl The URL of the image to download
 * @param fileName The desired filename for the uploaded image
 * @param bucketName The name of the Supabase storage bucket
 * @returns The public URL of the uploaded image
 */
export async function downloadAndUploadImage(imageUrl: string, fileName: string, bucketName: string = 'awardees'): Promise<string | null> {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    // Verify the content is an image
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`URL does not point to an image: ${contentType}`);
    }

    // Convert the response to a blob
    const imageBlob = await response.blob();

    // Generate a unique filename if needed
    const fileExtension = getExtensionFromContentType(contentType) || getExtensionFromUrl(imageUrl) || '.jpg';
    const uniqueFileName = `${Date.now()}-${fileName}${fileExtension}`;
    
    // Upload the image to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, imageBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType,
      });

    if (error) {
      console.error('Error uploading image to Supabase:', error);
      throw error;
    }

    // Get the public URL of the uploaded image
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in downloadAndUploadImage:', error);
    return null;
  }
}

/**
 * Updates an awardee with an image URL in the database
 * @param awardeeId The ID of the awardee to update
 * @param imageUrl The URL of the image to set
 * @returns Success status
 */
export async function updateAwardeeWithImage(awardeeId: string, imageUrl: string): Promise<boolean> {
  try {
    // Update the awardee record with the image URL
    const { data, error } = await supabase
      .from('awardees')
      .update({ image_url: imageUrl })
      .eq('id', awardeeId)
      .select();

    if (error) {
      console.error('Error updating awardee with image URL:', error);
      return false;
    }

    // Update the corresponding profile record
    const awardee = data?.[0];
    if (awardee?.profile_id) {
      await supabase
        .from('profiles')
        .update({ avatar_url: imageUrl })
        .eq('id', awardee.profile_id);
    }

    return true;
  } catch (error) {
    console.error('Error in updateAwardeeWithImage:', error);
    return false;
  }
}

/**
 * Helper function to get file extension from content type
 */
function getExtensionFromContentType(contentType: string): string | null {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
  };

  return mimeToExt[contentType] || null;
}

/**
 * Helper function to get file extension from URL
 */
function getExtensionFromUrl(url: string): string | null {
  const match = url.match(/\.([^.?#]+)(?:[?#]|$)/i);
  return match ? `.${match[1]}` : null;
}

/**
 * Function to process a list of awardees with Google image links
 */
export async function processAwardeesWithImageLinks(
  awardeeImageLinks: { awardeeId: string; imageUrl: string }[]
): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;

  for (const { awardeeId, imageUrl } of awardeeImageLinks) {
    try {
      // Extract name from the awardee record to use as filename
      const { data: awardee, error: fetchError } = await supabase
        .from('awardees')
        .select('name')
        .eq('id', awardeeId)
        .single();

      if (fetchError || !awardee) {
        console.error(`Failed to fetch awardee with ID ${awardeeId}:`, fetchError);
        failureCount++;
        continue;
      }

      // Sanitize the name to create a valid filename
      const sanitizedName = awardee.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      // Download and upload the image
      const uploadedImageUrl = await downloadAndUploadImage(imageUrl, sanitizedName);

      if (uploadedImageUrl) {
        // Update the awardee record with the new image URL
        const updateSuccess = await updateAwardeeWithImage(awardeeId, uploadedImageUrl);
        
        if (updateSuccess) {
          successCount++;
          console.log(`Successfully processed image for ${awardee.name}`);
        } else {
          failureCount++;
          console.error(`Failed to update awardee ${awardeeId} with image URL`);
        }
      } else {
        failureCount++;
        console.error(`Failed to download and upload image for ${awardee.name}`);
      }
    } catch (error) {
      console.error(`Error processing awardee ID ${awardeeId}:`, error);
      failureCount++;
    }
  }

  return { successCount, failureCount };
}