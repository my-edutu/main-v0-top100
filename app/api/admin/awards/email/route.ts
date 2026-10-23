import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { sendTransactionalEmail } from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

export async function POST(request: NextRequest) {
  const originFailure = rejectCrossOriginMutation(request)
  if (originFailure) return originFailure

  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const orderId = typeof payload.orderId === 'string' ? payload.orderId.trim() : ''
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : ''
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    return NextResponse.json({ message: 'Choose a valid award order.' }, { status: 400 })
  }
  if (!subject || subject.length > 160 || /[\r\n]/.test(subject)) {
    return NextResponse.json({ message: 'Enter an email subject of up to 160 characters.' }, { status: 400 })
  }
  if (!message || message.length > 4000) {
    return NextResponse.json({ message: 'Enter a message of up to 4,000 characters.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: order, error } = await supabase
    .from('award_orders')
    .select('id, recipient_name, email, profiles!award_orders_profile_id_fkey(full_name, email)')
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    console.error('[admin-awards-email] Failed to look up award order:', error)
    return NextResponse.json({ message: 'Could not look up this award order.' }, { status: 500 })
  }
  if (!order) return NextResponse.json({ message: 'Award order not found.' }, { status: 404 })

  const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles
  const recipient = (profile?.email || order.email || '').trim().toLowerCase()
  const recipientName = profile?.full_name || order.recipient_name || 'Awardee'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return NextResponse.json({ message: 'This award order does not have a valid recipient email.' }, { status: 409 })
  }

  const rateLimit = await checkRateLimit({
    maxRequests: 5,
    windowSeconds: 900,
    identifier: `admin-award-email:${recipient}`,
  })
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit, 'Too many emails have been sent to this recipient. Please wait before sending another.')
  }

  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>')
  const result = await sendTransactionalEmail({
    to: recipient,
    toName: recipientName,
    subject,
    text: message,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#211f1c;white-space:normal"><p>Hello ${escapeHtml(recipientName)},</p><p>${safeMessage}</p><p>Africa Future Leaders</p></div>`,
  })

  if (!result.ok) {
    console.error('[admin-awards-email] Provider rejected email:', result.reason)
    return NextResponse.json({ message: 'The email could not be sent. Check the transactional email provider configuration and retry.' }, { status: 502 })
  }

  console.info('[admin-awards-email] Award order email accepted', { adminId: adminCheck.user.id, orderId })
  return NextResponse.json({ message: 'Email sent.', sentTo: recipient })
}
