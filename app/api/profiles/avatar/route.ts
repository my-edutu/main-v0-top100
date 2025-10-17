import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = process.env.SUPABASE_AVATARS_BUCKET ?? 'avatars'

const createFileName = (userId: string, file: File) => {
  const extension = file.name.split('.').pop() ?? 'jpg'
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

    const supabase = createClient()

    const filePath = createFileName(user.id, file)
    const arrayBuffer = await file.arrayBuffer()

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true, // Allow overwriting the same file
      })

    if (uploadError) {
      if (uploadError.message.includes('not found')) {
        return NextResponse.json(
          {
            error: `Storage bucket "${BUCKET_NAME}" is missing. Create it in Supabase or set SUPABASE_AVATARS_BUCKET to an existing bucket.`,
          },
          { status: 500 },
        )
      }

      console.error('[avatars] upload failed', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
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