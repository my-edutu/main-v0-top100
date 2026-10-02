import type { createAdminClient } from '@/lib/supabase/server'

type EmailOutboxDb = ReturnType<typeof createAdminClient>

export async function enqueueMemberEmail(
  db: EmailOutboxDb,
  input: {
    kind: 'welcome' | 'direct_message'
    recipientId: string
    senderName: string
    conversationId?: string
    dedupeKey: string
  },
) {
  const { error } = await db.from('member_email_outbox').upsert({
    dedupe_key: input.dedupeKey,
    kind: input.kind,
    recipient_id: input.recipientId,
    conversation_id: input.conversationId ?? null,
    sender_name: input.senderName,
  }, { onConflict: 'dedupe_key', ignoreDuplicates: true })
  if (error) throw new Error(`Could not enqueue member email: ${error.message}`)
}
