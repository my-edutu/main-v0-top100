import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { createAdminClient } from '@/lib/supabase/server'
import { reviewContacts, type ContactAttempt } from '@/lib/admin/member-contact-review'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
const schema = z.object({ awardeeIds: z.array(z.string().uuid()).min(1).max(500) }).strict()
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginMutation(request)
  if (originError) return originError
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ message: 'Select between 1 and 500 awardees.' }, 400)
  try {
    const db = createAdminClient()
    const ids = [...new Set(parsed.data.awardeeIds)]
    const awardees = await db.from('awardees').select('id,name,email,profile_id').in('id', ids)
    if (awardees.error) throw new Error('Could not check selected awardees.')
    if (awardees.data.length !== ids.length) return json({ message: 'Some selected records no longer exist. Refresh the awardee list.' }, 409)
    const profileIds = awardees.data.flatMap(a => a.profile_id ? [a.profile_id] : [])
    const profiles = profileIds.length ? await db.from('profiles').select('id,user_id,email').in('id', profileIds) : { data: [], error: null }
    if (profiles.error) throw new Error('Could not check linked accounts.')
    const today = new Date().toISOString().slice(0, 10)
    const recipients = reviewContacts(awardees.data, profiles.data ?? [], [], today)
    const emails = [...new Set(recipients.map(r => r.email).filter(Boolean))]
    const attempts: ContactAttempt[] = []
    // Query tracking even if every selected record is missing an email: setup failure is not an empty audience.
    for (let offset = 0; ; offset += 500) {
      let query = db.from('admin_member_contact_attempts').select('id,email,status,contact_day')
        .or(`contact_day.eq.${today},status.in.(sending,unknown)`).order('id').range(offset, offset + 499)
      if (emails.length) query = query.in('email', emails)
      const page = await query
      if (page.error) return json({ message: 'Contact tracking is not ready. Apply the member contact migration on Dokploy.' }, 503)
      attempts.push(...page.data)
      if (page.data.length < 500) break
    }
    const origin = new URL(process.env.TOP100_SITE_URL || SITE_URL).origin
    if (!origin.startsWith('https://')) return json({ message: 'Configure a public HTTPS site address before contacting members.' }, 503)
    const smtpReady = Boolean(process.env.BREVO_SMTP_LOGIN?.trim() && process.env.BREVO_SMTP_KEY)
    return json({ recipients: reviewContacts(awardees.data, profiles.data ?? [], attempts, today), origin, smtpReady,
      message: smtpReady ? null : 'Email sending is not configured. Add the SMTP credentials in Dokploy.' })
  } catch {
    return json({ message: 'Could not check recipients. Try checking again before sending.' }, 503)
  }
}
