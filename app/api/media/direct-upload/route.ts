import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getCurrentUser } from '@/lib/auth-server'
import { requireAdmin } from '@/lib/api/require-admin'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { getMediaStorageConfig } from '@/lib/media/storage-config'
import { prepareDirectUpload, readDirectUpload } from '@/lib/media/direct-upload'
import { uploadMedia } from '@/lib/media/storage'
import { AVATAR_PRESET, PHOTO_PRESET, processUpload } from '@/lib/image-processing'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const blocked = rejectCrossOriginMutation(request)
  if (blocked) return blocked
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const rate = checkRateLimit({ ...RATE_LIMITS.UPLOAD, maxRequests: 30, identifier: `direct-upload:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate)
  try {
    if (getMediaStorageConfig().provider !== 'r2') return NextResponse.json({ fallback: true }, { status: 409 })
    const body = await request.json()
    if (!['avatar', 'portrait', 'editor'].includes(body.purpose)) return NextResponse.json({ error: 'Invalid upload purpose.' }, { status: 400 })
    if (body.purpose === 'editor') {
      const admin = await requireAdmin(request)
      if ('error' in admin) return admin.error
    }
    if (body.action === 'prepare') {
      return NextResponse.json(await prepareDirectUpload(user.id, body.purpose, body.size, body.contentType))
    }
    if (body.action !== 'complete' || typeof body.ticket !== 'string' || body.purpose === 'portrait') return NextResponse.json({ error: 'Invalid upload action.' }, { status: 400 })
    const upload = await readDirectUpload(body.ticket, user.id, body.purpose)
    try {
      // Reject invalid image bytes before the processing helper's legacy fallback.
      await sharp(upload.bytes, { limitInputPixels: 40_000_000 }).metadata()
      const processed = await processUpload(upload.bytes, body.purpose === 'avatar' ? AVATAR_PRESET : PHOTO_PRESET, upload.contentType)
      const bucket = body.purpose === 'avatar' ? process.env.SUPABASE_AVATARS_BUCKET || 'avatars' : process.env.SUPABASE_UPLOADS_BUCKET || 'uploads'
      const result = await uploadMedia({ bucket, path: `users/${user.id}/${crypto.randomUUID()}.${processed.extension}`, body: processed.data, contentType: processed.contentType, cacheControl: 'public, max-age=31536000, immutable' })
      return NextResponse.json({ url: result.publicUrl })
    } finally {
      // Lifecycle cleanup also expires abandoned objects if deletion is temporarily unavailable.
      await upload.remove().catch(() => console.warn('[direct-upload] temporary object cleanup deferred'))
    }
  } catch (error) {
    console.error('[direct-upload]', error instanceof Error ? error.name : 'error')
    return NextResponse.json({ error: 'Upload could not be completed. Please try again.' }, { status: 400 })
  }
}
