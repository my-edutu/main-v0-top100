import type { SupabaseClient } from '@supabase/supabase-js'

export type WhatsAppGroupKey = 'group-1' | 'group-2' | 'group-3'

export type WhatsAppGroup = {
  key: WhatsAppGroupKey
  label: string
  inviteUrl: string
}

// Invite links must be rotated and supplied through private server environment
// variables. Never embed active group invites in source control or client bundles.
export const WHATSAPP_GROUPS: Record<WhatsAppGroupKey, Omit<WhatsAppGroup, 'inviteUrl'>> = {
  'group-1': { key: 'group-1', label: 'Group 1' },
  'group-2': { key: 'group-2', label: 'Group 2' },
  'group-3': { key: 'group-3', label: 'Group 3' },
}

const GROUP_URL_ENV: Record<WhatsAppGroupKey, string> = {
  'group-1': 'WHATSAPP_GROUP_1_INVITE_URL',
  'group-2': 'WHATSAPP_GROUP_2_INVITE_URL',
  'group-3': 'WHATSAPP_GROUP_3_INVITE_URL',
}

export class WhatsAppGroupSetupError extends Error {
  constructor() {
    super('WhatsApp group invitations are not configured.')
    this.name = 'WhatsAppGroupSetupError'
  }
}

export function getWhatsAppGroup(groupKey: unknown): WhatsAppGroup | null {
  if (typeof groupKey !== 'string' || !Object.hasOwn(WHATSAPP_GROUPS, groupKey)) return null
  const key = groupKey as WhatsAppGroupKey
  const inviteUrl = process.env[GROUP_URL_ENV[key]]?.trim() ?? ''
  if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(?:\?.*)?$/.test(inviteUrl)) {
    throw new WhatsAppGroupSetupError()
  }
  return { ...WHATSAPP_GROUPS[key], inviteUrl }
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
  // Fail before reserving a group if an invitation has not been configured.
  getWhatsAppGroup(candidate.key)
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
