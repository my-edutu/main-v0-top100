// app/api/member/uploads/route.ts
// Member-gated image upload. The existing /api/uploads is admin-only, so
// members need their own surface — with a stricter allowlist and a per-member
// path prefix so one member can never overwrite another's file.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { memberUploadPath, validateUpload } from '@/lib/uploads/validate'

export const runtime = 'nodejs'

const BUCKET_NAME = process.env.SUPABASE_UPLOADS_BUCKET ?? 'uploads'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = checkRateLimit({ ...RATE_LIMITS.UPLOAD, identifier: `member-upload:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many uploads. Please wait a few minutes.')

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ message: 'Invalid upload.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'No file provided.' }, { status: 400 })
  }

  const validation = validateUpload({ type: file.type, size: file.size, name: file.name })
  if (!validation.ok) {
    return NextResponse.json({ message: validation.reason }, { status: 400 })
  }

  const supabase = createAdminClient()
  const path = memberUploadPath(user.id, file.name)

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: '3600',
      // Never upsert: the timestamped path is unique, and allowing overwrite
      // would let a crafted path clobber an existing object.
      upsert: false,
    })

  if (uploadError) {
    console.error('[member-upload] storage upload failed', user.id, uploadError)
    if (/bucket/i.test(uploadError.message ?? '')) {
      return NextResponse.json(
        { message: `Storage bucket "${BUCKET_NAME}" is missing. Ask the admin to create it in Supabase.` },
        { status: 503 },
      )
    }
    return NextResponse.json({ message: 'Could not upload that image.' }, { status: 500 })
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl.publicUrl, path })
}
