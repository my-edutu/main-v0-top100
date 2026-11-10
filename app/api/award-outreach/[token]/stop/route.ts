import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'
export const runtime = 'nodejs'
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!z.string().uuid().safeParse(token).success) return new NextResponse('Link not found.', { status: 404 })
  const { data, error } = await createAdminClient().from('award_outreach_contacts').update({ suppressed: true, next_follow_up_at: null, updated_at: new Date().toISOString() }).eq('token', token).select('awardee_id').maybeSingle()
  if (error) return new NextResponse('Could not save your preference. Contact info@top100afl.com.', { status: 503 })
  if (!data) return new NextResponse('Link not found.', { status: 404 })
  const form = await request.formData().catch(() => null)
  if (form?.get('List-Unsubscribe') === 'One-Click') return new NextResponse(null, { status: 200 })
  return NextResponse.redirect(new URL(`/award-outreach/stop/${token}?done=1`, SITE_URL), 303)
}
