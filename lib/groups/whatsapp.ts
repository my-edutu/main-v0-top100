import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type WhatsAppGroupKey = 'group-1' | 'group-2' | 'group-3'

export type WhatsAppGroup = {
  key: WhatsAppGroupKey
  label: string
  inviteUrl: string
}

export const WHATSAPP_GROUPS: Record<WhatsAppGroupKey, WhatsAppGroup> = {
  'group-1': {
    key: 'group-1',
    label: 'Group 1',
    inviteUrl: 'https://chat.whatsapp.com/CBxGOfyMbCP3YzceNrHLkm?mode=gi_t',
  },
  'group-2': {
    key: 'group-2',
    label: 'Group 2',
    inviteUrl: 'https://chat.whatsapp.com/F8p9rErOr6VAYGZbhaske8?mode=gi_t',
  },
  'group-3': {
    key: 'group-3',
    label: 'Group 3',
    inviteUrl: 'https://chat.whatsapp.com/FyQZI3OJ0OJJJpHW71lGeR?mode=gi_t',
  },
}

export function getWhatsAppGroup(groupKey: unknown): WhatsAppGroup | null {
  return typeof groupKey === 'string' && Object.hasOwn(WHATSAPP_GROUPS, groupKey)
    ? WHATSAPP_GROUPS[groupKey as WhatsAppGroupKey]
    : null
}

export function getWhatsAppGroupIndexForProfile(profileId: string): number {
  return createHash('sha256').update(profileId).digest().readUInt32BE(0) % 3
}

export function getWhatsAppGroupForProfile(profileId: string): WhatsAppGroup {
  const index = getWhatsAppGroupIndexForProfile(profileId)
  return Object.values(WHATSAPP_GROUPS)[index]
}

export function isMissingWhatsAppGroupAssignmentsTable(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /whatsapp_group_assignments.*(does not exist|schema cache)|could not find the table/i.test(
    error.message ?? '',
  )
}

export async function resolveWhatsAppGroupAssignment(
  supabase: SupabaseClient,
  profileId: string,
  randomIndex: number,
): Promise<{ group: WhatsAppGroup; created: boolean }> {
  const existing = await supabase
    .from('whatsapp_group_assignments')
    .select('group_key')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existing.error) throw existing.error
  if (existing.data) {
    const group = getWhatsAppGroup(existing.data.group_key)
    if (!group) throw new Error('The saved WhatsApp group assignment is invalid.')
    return { group, created: false }
  }

  if (!Number.isInteger(randomIndex) || randomIndex < 0 || randomIndex >= 3) {
    throw new RangeError('The WhatsApp group random index must be between 0 and 2.')
  }

  const candidate = Object.values(WHATSAPP_GROUPS)[randomIndex]
  const inserted = await supabase
    .from('whatsapp_group_assignments')
    .upsert(
      { profile_id: profileId, group_key: candidate.key },
      { onConflict: 'profile_id', ignoreDuplicates: true },
    )
    .select('group_key')
    .maybeSingle()

  if (inserted.error) throw inserted.error
  if (inserted.data) {
    const group = getWhatsAppGroup(inserted.data.group_key)
    if (!group) throw new Error('The saved WhatsApp group assignment is invalid.')
    return { group, created: true }
  }

  const saved = await supabase
    .from('whatsapp_group_assignments')
    .select('group_key')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (saved.error) throw saved.error
  const group = getWhatsAppGroup(saved.data?.group_key)
  if (!group) throw new Error('The saved WhatsApp group assignment could not be loaded.')
  return { group, created: false }
}
