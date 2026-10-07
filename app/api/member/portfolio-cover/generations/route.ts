import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { createAdminClient } from '@/lib/supabase/server'
import { uploadMedia } from '@/lib/media/storage'
import { renderPortfolioCover } from '@/lib/portfolio-cover/render-cover'
import { normalizePortfolioCoverFields, portfolioCoverFieldsSchema } from '@/lib/portfolio-cover/validation'
import { preparePortrait, validatePortraitUpload } from '@/lib/portfolio-cover/image'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const blocked = rejectCrossOriginMutation(request)
  if (blocked) return blocked

  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })


  const rate = await checkRateLimit({
    ...RATE_LIMITS.UPLOAD,
    identifier: `portfolio-cover:${getClientIdentifier(request.headers)}:${user.id}`,
  })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many photo uploads. Please wait a few minutes.')

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ message: 'Choose a portrait photo to continue.' }, { status: 400 })
  }

  if (form.get('consent') !== 'true') {
    return NextResponse.json({ message: 'Confirm that you have permission to use this photo.' }, { status: 400 })
  }

  let fieldsInput: unknown = {}
  const rawFields = form.get('fields')
  if (typeof rawFields === 'string') {
    try {
      fieldsInput = JSON.parse(rawFields)
    } catch {
      return NextResponse.json({ message: 'Check the name shown on your cover.' }, { status: 400 })
    }
  }
  const parsedFields = portfolioCoverFieldsSchema.safeParse(fieldsInput)
  if (!parsedFields.success) return NextResponse.json({ message: 'The cover name is invalid or too long.' }, { status: 400 })
  const fields = normalizePortfolioCoverFields(parsedFields.data)

  const file = form.get('portrait')
  if (!(file instanceof File)) return NextResponse.json({ message: 'Choose a portrait photo to continue.' }, { status: 400 })
  const original = Buffer.from(await file.arrayBuffer())
  const validation = validatePortraitUpload(original, file.type)
  if (!validation.ok) {
    const message = validation.code === 'too_large'
      ? 'Portrait must be 8 MB or smaller.'
      : 'Upload a valid JPG, PNG or WebP image.'
    return NextResponse.json({ message }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: profile, error: profileReadError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()
  if (profileReadError || !profile) {
    return NextResponse.json({ message: 'We could not load your profile name. Refresh and try again.' }, { status: 503 })
  }

  try {
    const memberName = fields.name || profile.full_name || 'Africa Future Leader'
    const portrait = await preparePortrait(original)
    const cover = await renderPortfolioCover({ portrait, memberName, fields })
    const path = `${user.id}/afl-2026-cover.png`
    const uploaded = await uploadMedia({
      bucket: process.env.PORTFOLIO_COVER_BUCKET || 'portfolio-covers',
      path,
      body: cover,
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true,
    })
    const coverUrl = new URL(uploaded.publicUrl)
    coverUrl.searchParams.set('v', Date.now().toString())

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ portfolio_cover_url: coverUrl.toString() })
      .eq('id', user.id)
    if (profileUpdateError) throw profileUpdateError

    return NextResponse.json({ coverUrl: coverUrl.toString() })
  } catch (error) {
    console.error('[portfolio-cover] template cover save failed', { memberId: user.id, error })
    return NextResponse.json({ message: 'We could not save your cover. Please try again.' }, { status: 503 })
  }
}
