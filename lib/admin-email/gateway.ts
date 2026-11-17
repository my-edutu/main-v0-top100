import { z } from 'zod'
import type { SendInput } from '@/lib/email/send'

const payloadSchema = z.object({
  subject: z.string().min(1).max(300).regex(/^[^\r\n]+$/),
  body: z.string().max(500_000),
  content_type: z.enum(['html', 'richtext', 'plain', 'markdown']),
  recipients: z.array(z.object({ uuid: z.string().uuid(), email: z.string().email().max(320) }).passthrough()).length(1),
  campaign: z.object({ uuid: z.string().uuid() }).passthrough(),
  attachments: z.array(z.unknown()).max(0).nullish(),
}).passthrough()
export type GatewayClaim = { recipientId: string }
export type GatewayEvidence = GatewayClaim & { email: string; name: string; unsubscribeUrl: string; unsubscribePage: string; message: { subject: string; html: string; text: string } | null; decision: 'send' | 'skip' | 'hold' }
export type GatewayDependencies = {
  waitForSlot: () => Promise<void>
  claim: (campaign: string, subscriber: string, email: string) => Promise<GatewayClaim | null>
  evidence: (claim: GatewayClaim) => Promise<GatewayEvidence>
  update: (recipientId: string, status: 'accepted' | 'skipped' | 'failed' | 'delivery_unknown', outcome: string, queueId?: string) => Promise<void>
  send: (input: SendInput) => Promise<{ ok: boolean; delivery?: 'not_sent' | 'unknown'; queueId?: string }>
}
export async function deliverGatewayMessage(payload: unknown, deps: GatewayDependencies): Promise<{ status: number }> {
  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) return { status: 400 }
  const message = parsed.data
  let claim: GatewayClaim | null
  try { claim = await deps.claim(message.campaign.uuid, message.recipients[0].uuid, message.recipients[0].email.trim().toLowerCase()) }
  catch { return { status: 503 } }
  if (!claim) return { status: 200 }
  try {
    await deps.waitForSlot()
    const current = await deps.evidence(claim)
    if (current.decision !== 'send') {
      await deps.update(claim.recipientId, current.decision === 'skip' ? 'skipped' : 'delivery_unknown', current.decision === 'skip' ? 'Recipient is no longer eligible.' : 'Delivery checks unavailable; no message was attempted.')
      return { status: 200 }
    }
    if (!current.message) throw new Error('Approved message unavailable')
    const result = await deps.send({ to: current.email, toName: current.name, ...current.message,
      idempotencyKey: `listmonk/${message.campaign.uuid}/${message.recipients[0].uuid}`,
      awardOutreach: { unsubscribeUrl: current.unsubscribeUrl } })
    const status = result.ok ? 'accepted' : result.delivery === 'not_sent' ? 'failed' : 'delivery_unknown'
    const outcome = result.ok ? 'SMTP accepted this message.' : result.delivery === 'not_sent' ? 'SMTP rejected the message before acceptance.' : 'SMTP acceptance is uncertain; review before resending.'
    if (result.queueId) await deps.update(claim.recipientId, status, outcome, result.queueId)
    else await deps.update(claim.recipientId, status, outcome)
  } catch {
    try { await deps.update(claim.recipientId, 'delivery_unknown', 'Delivery checks or finalisation failed; review before resending.') } catch { /* sending remains fenced against retries */ }
  }
  return { status: 200 }
}
