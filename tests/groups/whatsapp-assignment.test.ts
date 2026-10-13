import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import {
  getWhatsAppGroup,
  resolveWhatsAppGroupAssignment,
  WHATSAPP_GROUPS,
} from '@/lib/groups/whatsapp'

describe('WhatsApp group assignment', () => {
  it('resolves each random index to its fixed group invite', async () => {
    const supabase = createAssignmentStore()

    await expect(resolveWhatsAppGroupAssignment(supabase, 'member-1', 0)).resolves.toMatchObject({
      group: { key: 'group-1', inviteUrl: 'https://chat.whatsapp.com/CBxGOfyMbCP3YzceNrHLkm?mode=gi_t' },
      created: true,
    })
    await expect(resolveWhatsAppGroupAssignment(supabase, 'member-2', 1)).resolves.toMatchObject({
      group: { key: 'group-2', inviteUrl: 'https://chat.whatsapp.com/F8p9rErOr6VAYGZbhaske8?mode=gi_t' },
      created: true,
    })
    await expect(resolveWhatsAppGroupAssignment(supabase, 'member-3', 2)).resolves.toMatchObject({
      group: { key: 'group-3', inviteUrl: 'https://chat.whatsapp.com/FyQZI3OJ0OJJJpHW71lGeR?mode=gi_t' },
      created: true,
    })
    expect(Object.keys(WHATSAPP_GROUPS)).toEqual(['group-1', 'group-2', 'group-3'])
  })

  it('does not resolve an unknown saved key to an invite', () => {
    expect(getWhatsAppGroup('unknown')).toBeNull()
  })

  it('returns the first committed assignment when first visits race', async () => {
    const supabase = createAssignmentStore()
    const [first, second] = await Promise.all([
      resolveWhatsAppGroupAssignment(supabase, 'member-racing', 0),
      resolveWhatsAppGroupAssignment(supabase, 'member-racing', 2),
    ])

    expect(first.group.key).toBe(second.group.key)
    expect([first.created, second.created].sort()).toEqual([false, true])
    expect(supabase.assignments).toHaveLength(1)
    expect(supabase.upsertOptions).toEqual([
      { onConflict: 'profile_id', ignoreDuplicates: true },
      { onConflict: 'profile_id', ignoreDuplicates: true },
    ])
  })
})

function createAssignmentStore() {
  const assignments: Array<{ profile_id: string; group_key: string }> = []
  const upsertOptions: unknown[] = []
  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== 'whatsapp_group_assignments') throw new Error(`Unexpected table: ${table}`)
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_column: string, profileId: string) => ({
            maybeSingle: vi.fn(async () => ({
              data: assignments.find((row) => row.profile_id === profileId) ?? null,
              error: null,
            })),
          })),
        })),
        upsert: vi.fn((
          row: { profile_id: string; group_key: string },
          options?: { onConflict?: string; ignoreDuplicates?: boolean },
        ) => {
          upsertOptions.push(options)
          const query = {
            select: vi.fn(() => query),
            maybeSingle: vi.fn(async () => {
              await Promise.resolve()
              const existing = assignments.find((current) => current.profile_id === row.profile_id)
              if (existing) return { data: null, error: null }
              assignments.push(row)
              return { data: row, error: null }
            }),
          }
          return query
        }),
      }
    }),
    assignments,
    upsertOptions,
  }
  return supabase as unknown as SupabaseClient & { assignments: typeof assignments }
}
