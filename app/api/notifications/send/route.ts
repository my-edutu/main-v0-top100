import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { POST as broadcast } from '@/app/api/admin/notifications/broadcast/route'

// Keep the older admin screen on the same real inbox + push delivery flow.
export async function POST(request: NextRequest) {
  let body
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid request body.' }, { status: 400 }) }
  const response = await broadcast(new NextRequest(request.url, {
    method: 'POST', headers: request.headers,
    body: JSON.stringify({ title: body.title, message: body.body, audience: 'all' }),
  }))
  const data = await response.json()
  if (!response.ok) return Response.json({ error: data.message }, { status: response.status })
  const pushStatus = !data.push?.configured ? 'pending' : data.push.failed ? 'failed' : 'sent'
  await createAdminClient().from('notification_history').insert({
    title: String(body.title ?? '').slice(0, 120),
    body: String(body.body ?? '').slice(0, 2000),
    url: '/dashboard/notifications',
    recipient_count: data.push?.accepted ?? 0,
    status: pushStatus,
    sent_at: new Date().toISOString(),
  })
  return Response.json({
    success: true,
    sentCount: data.push?.accepted ?? 0,
    failedCount: data.push?.failed ?? 0,
    recipients: data.recipients,
    message: `Saved to ${data.recipients} member inboxes. Push service accepted ${data.push?.accepted ?? 0} messages.`,
    push: data.push,
  })
}
