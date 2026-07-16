// lib/dm-server.ts
// Server-only helpers for the member-to-member direct message API
// (/api/member/conversations*). Never import into client components.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConversationSummary, DirectMessage } from '@/lib/member-hub'

export const DM_BODY_MAX = 4000

/** Order a member pair so it matches the dm_conversations_ordered_pair constraint. */
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

/**
 * True when the error means the DM tables have not been created yet
 * (the 20260716_direct_messages.sql migration has not been run).
 */
export function isMissingDmTables(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  return /relation .* does not exist|could not find the table/i.test(error.message ?? '')
}

export const DM_SETUP_MESSAGE =
  'Messaging is not set up yet. Run supabase/SETUP-MEMBER-HUB.sql in the Supabase SQL editor.'

type ProfileLite = {
  id: string
  full_name: string | null
  email: string | null
  slug: string | null
  avatar_url: string | null
  headline: string | null
  membership_status: string | null
  notification_prefs: Record<string, unknown> | null
}

export async function loadProfilesLite(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, ProfileLite>> {
  if (ids.length === 0) return new Map()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, slug, avatar_url, headline, membership_status, notification_prefs')
    .in('id', ids)
  const map = new Map<string, ProfileLite>()
  for (const row of (data ?? []) as ProfileLite[]) map.set(row.id, row)
  return map
}

export function mapMessage(row: any, viewerId: string): DirectMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    mine: row.sender_id === viewerId,
    body: row.body ?? '',
    createdAt: row.created_at ?? new Date(0).toISOString(),
    readAt: row.read_at ?? null,
  }
}

export function mapConversation(
  row: any,
  viewerId: string,
  other: ProfileLite | undefined,
  extras: { unreadCount: number; lastMessage: { body: string; senderId: string; createdAt: string } | null },
): ConversationSummary {
  const name = other?.full_name || other?.email || 'Awardee'
  return {
    id: row.id,
    otherMember: {
      id: other?.id ?? (row.member_one === viewerId ? row.member_two : row.member_one),
      name,
      headline: other?.headline ?? '',
      slug: other?.slug ?? null,
      avatarUrl: other?.avatar_url ?? null,
      initials:
        name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part: string) => part[0]?.toUpperCase())
          .join('') || 'AF',
    },
    lastMessage: extras.lastMessage
      ? {
          body: extras.lastMessage.body,
          mine: extras.lastMessage.senderId === viewerId,
          createdAt: extras.lastMessage.createdAt,
        }
      : null,
    unreadCount: extras.unreadCount,
    lastMessageAt: row.last_message_at ?? row.created_at ?? new Date(0).toISOString(),
  }
}
