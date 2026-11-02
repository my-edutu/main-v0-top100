import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'
export const runtime = 'nodejs'
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!z.string().uuid().safeParse(token).success) return new NextResponse('Link not found.', { status: 404 })
  const db = createAdminClient()
  const { data: contact, error } = await db.from('award_outreach_contacts').select('awardee_id,tracking_started_at').eq('token', token).maybeSingle()
  if (error) return new NextResponse('This link is temporarily unavailable. Please contact info@top100afl.com.', { status: 503 })
  if (!contact) return new NextResponse('Link not found.', { status: 404 })
  const { data: awardee, error: awardeeError } = await db.from('awardees').select('profile_id').eq('id', contact.awardee_id).maybeSingle()
  if (awardeeError || !awardee) return new NextResponse('Link unavailable.', { status: 503 })
  // A link visit is an observation, not proof of a human click or awareness.
  if (request.headers.get('purpose') !== 'prefetch' && request.headers.get('sec-purpose') !== 'prefetch') {
    const stamp = new Date().toISOString()
    await db.from('award_outreach_contacts').update({ first_clicked_at: stamp, tracking_started_at: contact.tracking_started_at ?? stamp }).eq('token', token).is('first_clicked_at', null)
  }
  return NextResponse.redirect(new URL(awardee.profile_id ? '/dashboard/me/award' : '/signup', SITE_URL), { status: 302, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
}
