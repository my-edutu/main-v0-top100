import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api/require-admin';
import { createAdminClient } from '@/lib/supabase/server';

// The buckets this endpoint is allowed to write to. The bucket used to come
// straight from the request body, which let any caller who passed the admin
// check write into any bucket in the project — including ones this endpoint has
// no business touching.
const ALLOWED_BUCKETS = ['uploads', 'awardees', 'avatars'] as const;
const DEFAULT_BUCKET = 'uploads';

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Derived from the validated MIME type: the client-supplied filename must never
// reach a storage path.
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * resource_id becomes part of the object path, so anything that could climb out
 * of the intended prefix ("../", "/") has to go.
 */
function sanitizeResourceId(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 64) || 'generic';
}

export async function POST(request: NextRequest) {
  // Check if user is admin
  const adminCheck = await requireAdmin(request);
  if ('error' in adminCheck) {
    return adminCheck.error;
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const resourceId = sanitizeResourceId((formData.get('resource_id') as string) || 'generic');
    const requestedBucket = (formData.get('bucket') as string) || DEFAULT_BUCKET;

    if (!ALLOWED_BUCKETS.includes(requestedBucket as (typeof ALLOWED_BUCKETS)[number])) {
      return Response.json({
        success: false,
        message: `Unsupported bucket. Allowed: ${ALLOWED_BUCKETS.join(', ')}`
      }, { status: 400 });
    }
    const bucket = requestedBucket;

    if (!imageFile || imageFile.size === 0) {
      return Response.json({
        success: false,
        message: 'No image file provided'
      }, { status: 400 });
    }

    if (!VALID_TYPES.includes(imageFile.type)) {
      return Response.json({
        success: false,
        message: 'Invalid file type. Please upload JPG, PNG, WebP, or GIF.'
      }, { status: 400 });
    }

    if (imageFile.size > MAX_SIZE_BYTES) {
      return Response.json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Use service role client for storage operations
    const supabase = createAdminClient();

    // Both parts are server-controlled: a sanitized id and an extension derived
    // from the validated MIME type.
    const fileName = `${resourceId}-${Date.now()}.${EXTENSION_BY_TYPE[imageFile.type]}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        // Timestamped names are unique, so an upsert would only ever mean
        // overwriting something we didn't intend to.
        upsert: false
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
      .from(bucket)
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
