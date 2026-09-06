import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { PHOTO_PRESET, processUpload } from '@/lib/image-processing'
import { uploadMedia } from '@/lib/media/storage'

const BUCKET_NAME = process.env.SUPABASE_UPLOADS_BUCKET ?? 'uploads'

// Timestamped paths are never reused, so the bytes at a URL cannot change.
const CACHE_CONTROL = String(60 * 60 * 24 * 365)

const createFileName = (file: File, extension: string) => {
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

    // Editor assets are not always images; processUpload hands anything it
    // cannot decode back untouched, so a pdf still uploads as itself.
    const processed = await processUpload(
      await file.arrayBuffer(),
      PHOTO_PRESET,
      file.type || 'image/jpeg',
    )
    const filePath = createFileName(file, processed.extension)

    const uploaded = await uploadMedia({
      bucket: BUCKET_NAME,
      path: filePath,
      body: processed.data,
      contentType: processed.contentType,
      cacheControl: CACHE_CONTROL,
      upsert: false,
    })

    if (!uploaded.publicUrl) {
      return NextResponse.json({ error: 'Unable to resolve public URL' }, { status: 500 })
    }

    return NextResponse.json({ url: uploaded.publicUrl })
  } catch (error) {
    console.error('[uploads] unexpected error', error)
    return NextResponse.json({ error: 'Unexpected error occurred while uploading asset' }, { status: 500 })
  }
}
