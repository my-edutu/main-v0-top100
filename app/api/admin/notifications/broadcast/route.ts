import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { sendMemberPush } from '@/lib/push/send'
// app/api/admin/notifications/broadcast/route.ts
// Admin: broadcast a dashboard notification to members by fanning out one
// user_notifications row per targeted member. A shared broadcast_id in
// metadata lets us group them back into one "sent" entry.
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { sanitizeInput } from '@/lib/security'
import { PARTICIPANT_HANDBOOK } from '@/lib/handbook/participant-handbook'
import { handbookAudienceFingerprint, isParticipantHandbookPath, PARTICIPANT_HANDBOOK_CAMPAIGN_ID, resolveHandbookAudience } from '@/lib/dashboard/participant-handbook-broadcast'

export const runtime = 'nodejs'

type BroadcastRow = {
  title: string
  body: string
  delivered_at: string
  metadata: { broadcast_id?: string; audience?: string } | null
}
type HandbookProfile = { id: string; role?: unknown; membership_status?: unknown; cohort?: unknown }
type HandbookAwardee = { profile_id: string; year?: unknown }

async function resolveHandbookRecipientIds(supabase: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const profiles: HandbookProfile[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('profiles')
      .select('id,role,membership_status,cohort')
      .eq('role', 'user')
      .eq('membership_status', 'approved')
      .order('id')
      .range(offset, offset + 999)
    if (error) throw new Error('Could not resolve approved awardees.')
    profiles.push(...((data ?? []) as HandbookProfile[]))
    if (!data || data.length < 1000) break
  }

  const cohortProfiles = profiles.filter(profile => typeof profile.cohort === 'string' && profile.cohort.trim() === String(PARTICIPANT_HANDBOOK.year))
  const linkedAwardees: HandbookAwardee[] = []
  const cohortIds = cohortProfiles.map(profile => String(profile.id))
  for (let offset = 0; offset < cohortIds.length; offset += 500) {
    const ids = cohortIds.slice(offset, offset + 500)
    const { data, error } = await supabase.from('awardees')
      .select('profile_id,year')
      .in('profile_id', ids)
    if (error) throw new Error('Could not verify linked awardee records.')
    linkedAwardees.push(...((data ?? []) as HandbookAwardee[]))
  }
  return resolveHandbookAudience(profiles, linkedAwardees)
}

async function handleHandbookCampaign(body: Record<string, unknown>, supabase: ReturnType<typeof createAdminClient>) {
  const allowed = new Set(['campaign', 'action', 'expectedRecipients', 'audienceFingerprint'])
  if (Object.keys(body).some(key => !allowed.has(key))) {
    return NextResponse.json({ message: 'Use the configured handbook notification.' }, { status: 400 })
  }
  if (!isParticipantHandbookPath(PARTICIPANT_HANDBOOK.path)) {
    return NextResponse.json({ message: 'The handbook link is not configured safely.' }, { status: 500 })
  }
  if (body.action !== 'preview' && body.action !== 'send') {
    return NextResponse.json({ message: 'Choose preview or send.' }, { status: 400 })
  }

  let recipients: string[]
  try {
    recipients = await resolveHandbookRecipientIds(supabase)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Could not resolve recipients.' }, { status: 500 })
  }

  if (body.action === 'preview') {
    return NextResponse.json({ action: 'preview', campaignId: PARTICIPANT_HANDBOOK_CAMPAIGN_ID, recipients: recipients.length, audienceFingerprint: handbookAudienceFingerprint(recipients) })
  }
  if (!Number.isSafeInteger(body.expectedRecipients)
    || body.expectedRecipients !== recipients.length
    || body.audienceFingerprint !== handbookAudienceFingerprint(recipients)) {
    return NextResponse.json({ message: 'The eligible audience changed. Preview it again before sending.', recipients: recipients.length }, { status: 409 })
  }
  if (!recipients.length) return NextResponse.json({ action: 'send', recipients: 0, campaignId: PARTICIPANT_HANDBOOK_CAMPAIGN_ID })

  const rows = recipients.map(userId => ({
    user_id: userId,
    title: PARTICIPANT_HANDBOOK.notificationTitle,
    body: PARTICIPANT_HANDBOOK.notificationMessage,
    category: 'admin',
    cta_label: PARTICIPANT_HANDBOOK.notificationCta,
    cta_url: PARTICIPANT_HANDBOOK.path,
    campaign_id: PARTICIPANT_HANDBOOK_CAMPAIGN_ID,
    delivered_at: new Date().toISOString(),
    metadata: { audience: 'approved_2026', broadcast_id: PARTICIPANT_HANDBOOK_CAMPAIGN_ID, campaign_id: PARTICIPANT_HANDBOOK_CAMPAIGN_ID },
  }))

  const { data, error } = await supabase.from('user_notifications')
    .upsert(rows, { onConflict: 'user_id,campaign_id', ignoreDuplicates: true })
    .select('user_id')
  if (error) return NextResponse.json({ message: 'Could not send the handbook notification.' }, { status: 500 })

  const deliveredIds = (data ?? []).map((row: { user_id: string }) => row.user_id)
  const push = deliveredIds.length
    ? await sendMemberPush(supabase, deliveredIds, { title: PARTICIPANT_HANDBOOK.notificationTitle, body: PARTICIPANT_HANDBOOK.notificationMessage, url: PARTICIPANT_HANDBOOK.path, tag: PARTICIPANT_HANDBOOK_CAMPAIGN_ID })
    : null
  return NextResponse.json({ action: 'send', campaignId: PARTICIPANT_HANDBOOK_CAMPAIGN_ID, recipients: deliveredIds.length, push }, { status: 201 })
}

// GET — recent broadcasts, grouped by broadcast_id, newest first.
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_notifications')
    .select('title, body, delivered_at, metadata')
    .eq('category', 'admin')
    .order('delivered_at', { ascending: false })
    .limit(300)

  if (error) return NextResponse.json({ message: 'Could not load notifications.' }, { status: 500 })

  const groups = new Map<string, { id: string; title: string; message: string; audience: string; createdAt: string; recipients: number }>()
  for (const row of (data ?? []) as BroadcastRow[]) {
    const meta = row.metadata ?? {}
    const key = meta.broadcast_id ?? `${row.title}|${row.delivered_at}`
    const existing = groups.get(key)
    if (existing) {
      existing.recipients += 1
    } else {
      groups.set(key, {
        id: key,
        title: row.title,
        message: row.body,
        audience: meta.audience === 'approved_2026' ? 'approved_2026' : meta.audience === 'approved' ? 'approved' : 'all',
        createdAt: row.delivered_at,
        recipients: 1,
      })
    }
  }

  return NextResponse.json({ notifications: Array.from(groups.values()).slice(0, 12) })
}

// POST — send a broadcast to all members or approved members only.
export async function POST(request: NextRequest) {
  const originError = rejectCrossOriginMutation(request)
  if (originError) return originError
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (body.campaign === 'participant-handbook-2026') {
    return handleHandbookCampaign(body, supabase)
  }

  const title = sanitizeInput(String(body.title ?? ''))
  const message = sanitizeInput(String(body.message ?? ''))
  const audience = body.audience === 'approved' ? 'approved' : 'all'

  if (!title || !message) {
    return NextResponse.json({ message: 'Add a title and message before sending.' }, { status: 400 })
  }

  // Resolve the target audience.
  const targets: { id: string }[] = []
  for (let offset = 0; ; offset += 1000) {
    let pageQuery = supabase.from('profiles').select('id').eq('role', 'user').order('id').range(offset, offset + 999)
    if (audience === 'approved') pageQuery = pageQuery.eq('membership_status', 'approved')
    const { data, error } = await pageQuery
    if (error) return NextResponse.json({ message: 'Could not resolve recipients.' }, { status: 500 })
    targets.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  if (!targets || targets.length === 0) {
    return NextResponse.json({ message: 'No matching members to notify.', recipients: 0 }, { status: 200 })
  }

  const broadcastId = randomUUID()
  const deliveredAt = new Date().toISOString()
  const rows = targets.map((t: { id: string }) => ({
    user_id: t.id,
    title,
    body: message,
    category: 'admin',
    delivered_at: deliveredAt,
    metadata: { audience, broadcast_id: broadcastId },
  }))

  const { error: insertError } = await supabase.from('user_notifications').insert(rows)
  if (insertError) {
    return NextResponse.json({ message: 'Could not send the notification.' }, { status: 500 })
  }

  const push = await sendMemberPush(supabase, targets.map((t: { id: string }) => t.id), { title, body: message, url: '/dashboard/notifications', tag: broadcastId })
  return NextResponse.json({ recipients: rows.length, broadcastId, push }, { status: 201 })
}
