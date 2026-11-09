import { subscriberDecision, type ListmonkSubscription } from './subscriber-policy'
export type ProvisionMember = { id: string; email: string; name: string }
export type ProvisionInput = { id: string; subject: string; sendAt: string; templateId: number; members: ProvisionMember[] }
type Subscriber = ListmonkSubscription & { id: number; uuid: string }
type SavedRecipient = { awardee_id: string; email: string; name: string; subscriber_uuid: string }
export type ProvisionDependencies = {
  createList: (name: string) => Promise<{ id: number }>
  findSubscriber: (email: string) => Promise<Subscriber | null>
  createSubscriber: (email: string, name: string, listId: number) => Promise<{ id: number; uuid: string }>
  addToList: (id: number, listId: number) => Promise<unknown>
  suppressMember: (id: string) => Promise<void>
  saveRecipients: (campaignId: string, recipients: SavedRecipient[]) => Promise<void>
  createCampaign: (input: { name: string; subject: string; listId: number; templateId: number; sendAt: string }) => Promise<{ id: number; uuid: string }>
  markArmed: (id: string, remoteId: number, remoteUuid: string) => Promise<void>
  markScheduled: (id: string) => Promise<void>
  schedule: (remoteId: number) => Promise<unknown>
  markFailed: (id: string) => Promise<void>
  now: () => number
}
export async function provisionCampaign(input: ProvisionInput, deps: ProvisionDependencies): Promise<{ count: number; blocked: number }> {
  try {
    if (!Number.isFinite(Date.parse(input.sendAt)) || Date.parse(input.sendAt) <= deps.now()) throw new Error('The scheduled time has passed.')
    const list = await deps.createList(`Top100 ${input.id}`)
    const recipients: SavedRecipient[] = []
    let blocked = 0
    for (const member of input.members) {
      const existing = await deps.findSubscriber(member.email)
      const preference = subscriberDecision(existing)
      if (preference === 'hold') throw new Error('A subscriber preference could not be verified.')
      if (preference === 'suppress') { await deps.suppressMember(member.id); blocked++; continue }
      const subscriber = existing ?? await deps.createSubscriber(member.email, member.name, list.id)
      if (existing) await deps.addToList(existing.id, list.id)
      recipients.push({ awardee_id: member.id, email: member.email, name: member.name, subscriber_uuid: subscriber.uuid })
    }
    if (!recipients.length) throw new Error('No eligible subscribers remain.')
    await deps.saveRecipients(input.id, recipients)
    const remote = await deps.createCampaign({ name: `Top100 ${input.id}`, subject: input.subject, listId: list.id, templateId: input.templateId, sendAt: input.sendAt })
    await deps.markArmed(input.id, remote.id, remote.uuid)
    if (Date.parse(input.sendAt) <= deps.now()) throw new Error('The scheduled time passed during preparation.')
    await deps.schedule(remote.id)
    await deps.markScheduled(input.id)
    return { count: recipients.length, blocked }
  } catch (error) {
    try { await deps.markFailed(input.id) } catch { /* a non-scheduled creating record fails closed */ }
    throw error
  }
}
