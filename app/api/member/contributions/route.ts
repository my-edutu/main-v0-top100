import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { CONTRIBUTION_AREAS, contributionSchema } from '@/lib/community-contributions'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { PHOTO_PRESET, processUpload } from '@/lib/image-processing'
import { uploadMedia } from '@/lib/media/storage'

const RECEIPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id || !user.email) return NextResponse.json({ message: 'Please sign in to submit.' }, { status: 401 })
  const rate = await checkRateLimit({ ...RATE_LIMITS.CONTACT, identifier: `contribution:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many submissions. Please try again later.')
  const isMultipart = request.headers.get('content-type')?.includes('multipart/form-data')
  let payload: unknown
  let receipt: File | null = null
  if (isMultipart) {
    const formData = await request.formData()
    receipt = formData.get('receipt') instanceof File ? formData.get('receipt') as File : null
    payload = {
      campaign: String(formData.get('campaign') ?? ''),
      kind: String(formData.get('kind') ?? ''),
      area: String(formData.get('area') ?? ''),
      name: String(formData.get('name') ?? ''),
      details: String(formData.get('details') ?? ''),
      amount: String(formData.get('amount') ?? ''),
      currency: String(formData.get('currency') ?? ''),
      consent: String(formData.get('consent') ?? '') === 'true',
    }
  } else {
    payload = await request.json().catch(() => null)
  }
  const parsed = contributionSchema.safeParse(payload)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 })
  const data = parsed.data
  let receiptUrl: string | null = null
  if (receipt) {
    if (!RECEIPT_TYPES.has(receipt.type)) return NextResponse.json({ message: 'Upload a JPG, PNG, WebP, or PDF receipt.' }, { status: 400 })
    if (receipt.size > MAX_RECEIPT_SIZE) return NextResponse.json({ message: 'Receipt is too large. Maximum size is 5MB.' }, { status: 400 })
    try {
      const processed = await processUpload(await receipt.arrayBuffer(), PHOTO_PRESET, receipt.type)
      const uploaded = await uploadMedia({
        bucket: process.env.SUPABASE_UPLOADS_BUCKET ?? 'uploads',
        path: `contributions/${user.id}-${Date.now()}.${processed.extension}`,
        body: processed.data,
        contentType: processed.contentType,
        cacheControl: String(60 * 60 * 24 * 365),
        upsert: false,
      })
      receiptUrl = uploaded.publicUrl
    } catch {
      return NextResponse.json({ message: 'The receipt could not be uploaded. Please try again.' }, { status: 500 })
    }
  }
  const cashLines = data.kind === 'cash'
    ? [`Donation amount: ${data.currency} ${data.amount}`, receiptUrl ? `Donation receipt: ${receiptUrl}` : 'Donation receipt: Not uploaded yet.']
    : []
  const areaLabel = data.campaign === 'give-back' && data.area === 'partnership-team'
    ? 'Partnership proposals'
    : CONTRIBUTION_AREAS.find(option => option.value === data.area)?.label ?? (data.area || 'Not selected')
  const { error } = await createAdminClient().from('messages').insert({
    name: data.name, email: user.email,
    type: data.campaign === 'volunteer' ? 'volunteer' : 'partnership', status: 'unread',
    subject: `${data.campaign === 'volunteer' ? 'Top100 volunteer' : 'Social impact initiative'} — ${data.kind === 'cash' ? 'Cash donation' : 'Services'}`,
    message: [`Member ID: ${user.id}`, `Support: ${data.kind}`, `Focus area: ${areaLabel}`, ...cashLines, '', data.details, '', 'Member agreed to be contacted about this submission.'].join('\n'),
  })
  if (error) return NextResponse.json({ message: 'Could not save your submission. Please try again.' }, { status: 500 })
  return NextResponse.json({ saved: true }, { status: 201 })
}
