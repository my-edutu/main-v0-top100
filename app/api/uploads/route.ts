import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

const BUCKET_NAME = process.env.SUPABASE_UPLOADS_BUCKET ?? 'uploads'

const createFileName = (file: File) => {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '')
  const timestamp = Date.now()
  return `editor/${base || 'asset'}-${timestamp}.${extension}`
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const filePath = createFileName(file)
    const arrayBuffer = await file.arrayBuffer()

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      if (uploadError.message.includes('not found')) {
        return NextResponse.json(
          {
            error:
              `Storage bucket "${BUCKET_NAME}" is missing. Create it in Supabase or set SUPABASE_UPLOADS_BUCKET to an existing bucket.`,
          },
          { status: 500 },
        )
      }

      console.error('[uploads] upload failed', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path)

    if (!publicUrl?.publicUrl) {
      return NextResponse.json({ error: 'Unable to resolve public URL' }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl.publicUrl })
  } catch (error) {
    console.error('[uploads] unexpected error', error)
    return NextResponse.json({ error: 'Unexpected error occurred while uploading asset' }, { status: 500 })
  }
}

