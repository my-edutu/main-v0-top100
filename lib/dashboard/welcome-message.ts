import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyNewMessage } from '@/lib/email/dm-notification'

/** Stable message ID makes onboarding retries safe, including concurrent completions. */
export function welcomeMessageId(memberId: string) {
  const hex = createHash('sha256')
    .update(`top100-welcome-v1:${memberId}`)
    .digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export async function ensureWelcomeMessage(memberId: string) {
  const db = createAdminClient()
  let query = db
    .from('profiles')
    .select('id, full_name')
    .in('role', ['admin', 'superadmin'])
  query = process.env.TOP100_WELCOME_SENDER_ID
    ? query.eq('id', process.env.TOP100_WELCOME_SENDER_ID)
    : query.in('full_name', ['Nwosu Paul Light', 'Paul Light'])
  const { data: senders, error } = await query.limit(2)
  if (error || senders?.length !== 1)
    return {
      ok: false,
      reason:
        'Configure TOP100_WELCOME_SENDER_ID with Paul Light’s admin profile ID.',
    }
  const sender = senders[0]
  if (sender.id === memberId) return { ok: true }
  const [member_one, member_two] = [sender.id, memberId].sort()
  const { error: pairError } = await db
    .from('dm_conversations')
    .upsert(
      { member_one, member_two },
      { onConflict: 'member_one,member_two', ignoreDuplicates: true },
    )
  if (pairError)
    return { ok: false, reason: 'Could not create welcome conversation.' }
  const { data: conversation } = await db
    .from('dm_conversations')
    .select('id')
    .eq('member_one', member_one)
    .eq('member_two', member_two)
    .single()
  if (!conversation)
    return { ok: false, reason: 'Could not load welcome conversation.' }
  const { data: inserted, error: insertError } = await db
    .from('dm_messages')
    .upsert(
      {
        id: welcomeMessageId(memberId),
        conversation_id: conversation.id,
        sender_id: sender.id,
        body: 'Congratulations, and welcome to Top100 Africa Future Leaders! I’m Paul Light. This community is a place to connect, share your work and discover opportunities. Take a look around, introduce yourself, and reply here if you need a hand getting started. I’m glad you’re here.',
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    .select('id')
  if (insertError)
    return { ok: false, reason: 'Could not save welcome message.' }
  if (inserted?.length)
    await notifyNewMessage(db, {
      conversationId: conversation.id,
      recipientId: memberId,
      senderName: sender.full_name,
    })
  return { ok: true }
}
