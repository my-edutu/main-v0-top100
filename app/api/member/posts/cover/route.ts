import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { hasValidDemoSession } from '@/lib/dev-dashboard/auth'
import { DEMO_MEMBER_ID } from '@/lib/dev-dashboard/store'
import { PHOTO_PRESET, processUpload } from '@/lib/image-processing'
import { uploadMedia } from '@/lib/media/storage'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'

const CACHE_CONTROL = String(60 * 60 * 24 * 365)

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const blocked = rejectCrossOriginMutation(request)
  if (blocked) return blocked

  const user = await getCurrentUser()
  const memberId = user?.id ?? (hasValidDemoSession(request, process.env.NODE_ENV) ? DEMO_MEMBER_ID : null)
  if (!memberId) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ message: 'Choose an image to upload.' }, { status: 400 })
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return NextResponse.json({ message: 'Choose a JPG, PNG or WebP image.' }, { status: 400 })
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ message: 'Cover images must be 8 MB or smaller.' }, { status: 400 })

    const processed = await processUpload(await file.arrayBuffer(), PHOTO_PRESET, file.type)
    const uploaded = await uploadMedia({
      bucket: process.env.SUPABASE_UPLOADS_BUCKET ?? 'member-post-covers',
      path: `${memberId}/${crypto.randomUUID()}.${processed.extension}`,
      body: processed.data,
      contentType: processed.contentType,
      cacheControl: CACHE_CONTROL,
      upsert: false,
    })
    return NextResponse.json({ url: uploaded.publicUrl })
  } catch (error) {
    console.error('[member-post-cover] upload failed', error)
    return NextResponse.json({ message: 'Could not upload the cover image. Check Cloudflare media storage configuration.' }, { status: 503 })
  }
}
