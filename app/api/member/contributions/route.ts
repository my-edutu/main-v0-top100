import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { contributionSchema } from '@/lib/community-contributions'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id || !user.email) return NextResponse.json({ message: 'Please sign in to submit.' }, { status: 401 })
  const rate = await checkRateLimit({ ...RATE_LIMITS.CONTACT, identifier: `contribution:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many submissions. Please try again later.')
  const parsed = contributionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 })
  const data = parsed.data
  const { error } = await createAdminClient().from('messages').insert({
    name: data.name, email: user.email,
    type: data.campaign === 'volunteer' ? 'volunteer' : 'partnership', status: 'unread',
    subject: `${data.campaign === 'volunteer' ? 'Top100 volunteer' : 'Social impact initiative'} — ${data.kind === 'cash' ? 'Cash pledge' : 'Services'}`,
    message: [`Member ID: ${user.id}`, `Support: ${data.kind}`, ...(data.kind === 'cash' ? [`Pledged amount: ${data.currency} ${data.amount}`, 'Pledge only. No payment collected.'] : []), '', data.details, '', 'Member agreed to be contacted about this submission.'].join('\n'),
  })
  if (error) return NextResponse.json({ message: 'Could not save your submission. Please try again.' }, { status: 500 })
  return NextResponse.json({ saved: true }, { status: 201 })
}
