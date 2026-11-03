import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { processOutreachJobs } from '@/lib/awards/outreach-worker'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  const secret = process.env.AWARD_OUTREACH_WORKER_SECRET || process.env.EMAIL_OUTBOX_WORKER_SECRET || process.env.CRON_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!secret || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  if (!process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SMTP_KEY) return NextResponse.json({ message: 'Configure Brevo SMTP before processing outreach.' }, { status: 503 })
  try { return NextResponse.json(await processOutreachJobs(createAdminClient())) }
  catch { return NextResponse.json({ message: 'The outreach queue is unavailable.' }, { status: 503 }) }
}
