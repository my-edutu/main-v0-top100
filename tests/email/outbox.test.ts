import { expect, it } from 'vitest'
import { enqueueMemberEmail } from '@/lib/email/outbox'

it('stores a stable deduplicated email job without carrying a recipient address', async () => {
  let inserted: Record<string, unknown> | null = null
  let options: Record<string, unknown> | null = null
  const db = {
    from: (table: string) => {
      expect(table).toBe('member_email_outbox')
      return {
        upsert: async (row: Record<string, unknown>, nextOptions: Record<string, unknown>) => {
          inserted = row
          options = nextOptions
          return { error: null }
        },
      }
    },
  }

  await enqueueMemberEmail(db as never, {
    kind: 'welcome',
    recipientId: 'member-1',
    senderName: 'Paul Light',
    dedupeKey: 'welcome:member-1:v1',
  })

  expect(inserted).toEqual({
    dedupe_key: 'welcome:member-1:v1',
    kind: 'welcome',
    recipient_id: 'member-1',
    conversation_id: null,
    sender_name: 'Paul Light',
  })
  expect(options).toEqual({ onConflict: 'dedupe_key', ignoreDuplicates: true })
})
