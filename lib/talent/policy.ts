import { TALENT_POLICY_VERSION } from './contracts'
import type { TalentDraft } from './types'

type DiscoveryState = {
  profileId: string; status: string; discoveryEnabled: boolean; introductionsEnabled: boolean
  promotionEnabled: boolean; consentVersion: string | null; publishedRevision: number | null
  memberApproved: boolean; recognitionPublic: boolean; published: TalentDraft | null
}
export function canDiscoverTalent(profile: DiscoveryState): boolean {
  // Pending edits may coexist with the last reviewed public snapshot.
  return profile.discoveryEnabled === true && profile.consentVersion === TALENT_POLICY_VERSION && profile.publishedRevision !== null && profile.publishedRevision > 0 && profile.published !== null && profile.memberApproved === true && profile.recognitionPublic === true
}
export function canIntroduceTalent(profile: DiscoveryState, featureEnabled: boolean): boolean {
  return featureEnabled && canDiscoverTalent(profile) && profile.introductionsEnabled === true
}
export function canPromoteTalent(profile: DiscoveryState): boolean { return canDiscoverTalent(profile) && profile.promotionEnabled === true }
export function canReviewTalent(reviewerId: string, memberId: string): boolean { return Boolean(reviewerId) && reviewerId !== memberId }
export function canRespondToIntroduction(introduction: { profile_id: string; status: string }, memberId: string, decision: string): boolean {
  if (introduction.profile_id !== memberId) return false
  if (decision === 'reported') return !['closed', 'expired', 'reported'].includes(introduction.status)
  if (decision === 'withdrawn') return ['awaiting_member', 'accepted', 'introduced'].includes(introduction.status)
  return introduction.status === 'awaiting_member' && ['accepted', 'declined'].includes(decision)
}
export function canSendUpgradeEmail(flags: { enabled: boolean; launched: boolean; sendingEnabled: boolean }): boolean {
  return flags.enabled === true && flags.launched === true && flags.sendingEnabled === true
}
