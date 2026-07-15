// lib/member-hub-server.ts
// Server-only helpers that map DB rows onto the member-hub client types
// (lib/member-hub.ts). Never import into client components.
import type {
  MemberProfile,
  MemberNotification,
  MemberFeatureSubmission,
  MemberStatus,
} from '@/lib/member-hub'

const PREF_DEFAULTS = {
  recruiterVisible: true,
  emailVisible: false,
  showInDirectory: true,
  allowDirectMessages: true,
  opportunityAlerts: true,
  magazineAlerts: true,
  messageAlerts: true,
  eventReminders: true,
  hideEmailFromRecruiters: false,
  requireProfileApproval: true,
  securityEmails: true,
}

export type ProfilePrefs = typeof PREF_DEFAULTS

/** Preference keys stored inside profiles.notification_prefs (jsonb). */
export const PREF_KEYS = Object.keys(PREF_DEFAULTS) as (keyof ProfilePrefs)[]

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'AF'
  )
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** Map a `profiles` row (+ optional linked awardee id) to a MemberProfile. */
export function mapProfileToMember(row: any, awardeeId?: string | null): MemberProfile {
  const prefs = (row?.notification_prefs ?? {}) as Record<string, unknown>
  const name = row?.full_name || row?.email || 'Awardee'
  const status = (row?.membership_status ?? 'pending') as MemberStatus

  return {
    id: row.id,
    name,
    email: row?.email ?? '',
    inviteCode: row?.access_code ?? '',
    awardeeId: awardeeId ?? undefined,
    publicSlug: row?.slug ?? undefined,
    status,
    profileStatus: status === 'approved' ? 'approved' : 'submitted',
    headline: row?.headline ?? '',
    bio: row?.bio ?? '',
    location: row?.location ?? '',
    organization: row?.organization ?? '',
    field: row?.field ?? '',
    avatarInitials: initials(name),
    recruiterVisible: bool(prefs.recruiterVisible, PREF_DEFAULTS.recruiterVisible),
    emailVisible: bool(prefs.emailVisible, PREF_DEFAULTS.emailVisible),
    showInDirectory: bool(prefs.showInDirectory, PREF_DEFAULTS.showInDirectory),
    allowDirectMessages: bool(prefs.allowDirectMessages, PREF_DEFAULTS.allowDirectMessages),
    opportunityAlerts: bool(prefs.opportunityAlerts, PREF_DEFAULTS.opportunityAlerts),
    magazineAlerts: bool(prefs.magazineAlerts, PREF_DEFAULTS.magazineAlerts),
    messageAlerts: bool(prefs.messageAlerts, PREF_DEFAULTS.messageAlerts),
    eventReminders: bool(prefs.eventReminders, PREF_DEFAULTS.eventReminders),
    hideEmailFromRecruiters: bool(prefs.hideEmailFromRecruiters, PREF_DEFAULTS.hideEmailFromRecruiters),
    requireProfileApproval: bool(prefs.requireProfileApproval, PREF_DEFAULTS.requireProfileApproval),
    securityEmails: bool(prefs.securityEmails, PREF_DEFAULTS.securityEmails),
    bioUpdateCount: Number.isFinite(row?.bio_update_count) ? row.bio_update_count : 0,
    bioUpdateLimit: Number.isFinite(row?.bio_update_limit) ? row.bio_update_limit : 2,
    createdAt: row?.created_at ?? new Date(0).toISOString(),
  }
}

/** Map a `user_notifications` row to a MemberNotification. */
export function mapNotification(row: any): MemberNotification {
  const metadata = (row?.metadata ?? {}) as Record<string, unknown>
  return {
    id: row.id,
    title: row?.title ?? '',
    message: row?.body ?? '',
    audience: (metadata.audience === 'approved' ? 'approved' : 'all'),
    status: 'sent',
    createdAt: row?.delivered_at ?? row?.created_at ?? new Date(0).toISOString(),
    readBy: row?.read_at ? [row.user_id] : [],
  }
}

/** Map a `member_features` row to a MemberFeatureSubmission. */
export function mapFeature(row: any): MemberFeatureSubmission {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row?.member_name ?? '',
    title: row?.title ?? '',
    category: (row?.category ?? 'bio') as MemberFeatureSubmission['category'],
    summary: row?.summary ?? '',
    contactEmail: row?.contact_email ?? '',
    status: (row?.status ?? 'pending') as MemberFeatureSubmission['status'],
    createdAt: row?.created_at ?? new Date(0).toISOString(),
  }
}

/**
 * Given a patch of MemberProfile-shaped fields, split into direct profile
 * columns and merged notification_prefs. Returns the DB update payload.
 */
export function buildProfileUpdate(patch: Record<string, unknown>, existingPrefs: Record<string, unknown>) {
  const columns: Record<string, unknown> = {}
  if (typeof patch.headline === 'string') columns.headline = patch.headline
  if (typeof patch.bio === 'string') columns.bio = patch.bio
  if (typeof patch.location === 'string') columns.location = patch.location
  if (typeof patch.organization === 'string') columns.organization = patch.organization
  if (typeof patch.field === 'string') columns.field = patch.field

  const prefs = { ...existingPrefs }
  for (const key of PREF_KEYS) {
    if (typeof patch[key] === 'boolean') prefs[key] = patch[key]
  }

  return { columns, prefs }
}

/** Whether a patch changes a BIO/profile field that counts toward the update limit. */
export function patchTouchesBio(patch: Record<string, unknown>): boolean {
  return ['headline', 'bio', 'location', 'organization', 'field'].some(
    (key) => typeof patch[key] === 'string',
  )
}
