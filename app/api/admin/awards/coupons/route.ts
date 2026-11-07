import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { awardCouponDigest } from '@/lib/awards/coupon-server'
import { createAdminClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
}).strict()

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error

  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) {
    return NextResponse.json({ message: 'Choose an expiry date and time in Lagos.' }, { status: 400 })
  }

  const localExpiry = body.data.expiresAt
  // Check that the calendar date survived parsing before applying the Lagos offset.
  const calendar = new Date(`${localExpiry}Z`)
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 16) !== localExpiry) {
    return NextResponse.json({ message: 'Choose a valid expiry date and time.' }, { status: 400 })
  }

  const expiry = new Date(`${localExpiry}+01:00`)
  if (expiry.getTime() <= Date.now()) {
    return NextResponse.json({ message: 'Choose an expiry in the future.' }, { status: 400 })
  }

  const code = `AFL-${randomBytes(8).toString('hex').toUpperCase()}`
  const expiresAt = expiry.toISOString()
  try {
    const { error } = await createAdminClient().from('award_coupons').insert({
      code_digest: awardCouponDigest(code),
      enabled: true,
      allow_all_awardees: true,
      expires_at: expiresAt,
    })
    if (error) throw error
  } catch {
    return NextResponse.json({ message: 'Could not generate a coupon. Please try again.' }, { status: 503 })
  }

  return NextResponse.json({ code, expiresAt }, {
    status: 201,
    headers: { 'Cache-Control': 'no-store' },
  })
}
