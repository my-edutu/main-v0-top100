import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { AVATAR_PRESET, processUpload } from '@/lib/image-processing'
import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = process.env.SUPABASE_AVATARS_BUCKET ?? 'avatars'

// Paths are timestamped and never reused, so the object at a URL can never
// change and the browser is safe to keep it for a year. The old one-hour TTL
// meant returning visitors re-downloaded avatars they already had.
const CACHE_CONTROL = String(60 * 60 * 24 * 365)

const createFileName = (userId: string, extension: string) => {
  const timestamp = Date.now()
  return `users/${userId}-${timestamp}.${extension}`
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file type to ensure it's an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large. Maximum size is 5MB.' }, { status: 400 })
    }

    const supabase = await createClient()

    const processed = await processUpload(await file.arrayBuffer(), AVATAR_PRESET, file.type)
    const filePath = createFileName(user.id, processed.extension)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, processed.data, {
        contentType: processed.contentType,
        cacheControl: CACHE_CONTROL,
        upsert: true, // Allow overwriting the same file
      })

    if (uploadError) {
      console.error('[avatars] upload failed', uploadError)
      return NextResponse.json({ error: 'Avatar upload failed' }, { status: 500 })
    }

    const { data: publicUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path)

    if (!publicUrl?.publicUrl) {
      return NextResponse.json({ error: 'Unable to resolve public URL' }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl.publicUrl })
  } catch (error) {
    console.error('[avatars] unexpected error', error)
    return NextResponse.json({ error: 'Unexpected error occurred while uploading avatar' }, { status: 500 })
  }
}