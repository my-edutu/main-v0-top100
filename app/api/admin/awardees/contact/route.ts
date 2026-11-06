import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { sendTransactionalEmail } from '@/lib/email/send'
import { generateCode } from '@/lib/access-codes'
import { memberContactMessage } from '@/lib/admin/member-contact'
import { resolveContact } from '@/lib/admin/member-contact-review'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
const schema = z.object({ awardeeId: z.string().uuid(), template: z.enum(['welcome', 'reminder']), expectedEmail: z.string().email(), expectedActivated: z.boolean() }).strict()
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginMutation(request)
  if (originError) return originError
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  const input = schema.safeParse(await request.json().catch(() => null))
  if (!input.success) return json({ message: 'Select an awardee and template.' }, 400)
  if (!process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SMTP_KEY) return json({ message: 'Configure Brevo SMTP on the Dokploy server before sending.' }, 503)
  const db = createAdminClient()
  const { data: awardee, error } = await db.from('awardees').select('id,name,email,profile_id').eq('id', input.data.awardeeId).maybeSingle()
  if (error || !awardee) return json({ message: 'Could not load awardee.' }, 404)
  let profile: { id: string; user_id: string | null; email: string | null } | null = null
  if (awardee.profile_id) {
    const result = await db.from('profiles').select('id,user_id,email').eq('id', awardee.profile_id).maybeSingle()
    if (result.error) return json({ message: 'Could not check activation.' }, 503)
    profile = result.data
  }
  const { email, activated } = resolveContact(awardee, profile ?? undefined)
  if (email !== input.data.expectedEmail || activated !== input.data.expectedActivated) {
    return json({ message: 'This recipient changed after review. Check recipients again before sending.', outcome: 'skipped' }, 409)
  }
  if (!z.string().email().safeParse(email).success) return json({ message: 'No valid email address on this record.', outcome: 'skipped' }, 409)
  const held = await db.from('admin_member_contact_attempts').select('id').eq('email', email).in('status', ['sending', 'unknown']).limit(1)
  if (held.error) return json({ message: 'Contact tracking is unavailable. Apply the admin_member_contact migration.' }, 503)
  if (held.data?.length) return json({ message: 'An earlier delivery needs review in SMTP logs before another send.', outcome: 'skipped' }, 409)
  // Unique daily reservation prevents concurrent clicks and repeat bulk sends.
  const reservation = await db.from('admin_member_contact_attempts').insert({ awardee_id: awardee.id, admin_id: admin.user.id, email, template: input.data.template }).select('id').single()
  if (reservation.error) return json({ message: reservation.error.code === '23505' ? 'Already attempted today. Check delivery before contacting again.' : 'Contact tracking is unavailable. Apply the admin_member_contact migration.', outcome: 'skipped' }, reservation.error.code === '23505' ? 409 : 503)
  const attemptId = reservation.data.id
  let sending = false
  try {
    let code: string | undefined
    if (!profile?.user_id) {
      code = (await generateCode({ email, mode: 'single_use', durationHours: 168, label: 'Admin welcome / profile reminder', createdBy: admin.user.id })).code
    }
    const message = memberContactMessage({ template: input.data.template, name: awardee.name, code, origin: process.env.TOP100_SITE_URL || SITE_URL })
    const marked = await db.from('admin_member_contact_attempts').update({ status: 'sending' }).eq('id', attemptId)
    if (marked.error) throw new Error('Could not record sending state')
    sending = true
    const result = await sendTransactionalEmail({ to: email, toName: awardee.name, ...message, requireBrevoSmtp: true, idempotencyKey: `member-contact/${attemptId}` })
    const status = result.ok ? 'accepted' : result.delivery === 'not_sent' ? 'not_sent' : 'unknown'
    const saved = await db.from('admin_member_contact_attempts').update({ status }).eq('id', attemptId)
    if (saved.error) return json({ message: 'Delivery status could not be saved. Check SMTP logs before resending.', outcome: 'unknown' }, 502)
    return json({ message: result.ok ? 'SMTP accepted the email.' : status === 'unknown' ? 'Delivery uncertain. Check SMTP logs before resending.' : 'SMTP did not send the email.', outcome: status }, result.ok ? 200 : 502)
  } catch {
    await db.from('admin_member_contact_attempts').update({ status: sending ? 'unknown' : 'not_sent' }).eq('id', attemptId)
    return json({ message: sending ? 'Delivery uncertain. Check SMTP logs before resending.' : 'Could not prepare email. No email sent.', outcome: sending ? 'unknown' : 'not_sent' }, 502)
  }
}
