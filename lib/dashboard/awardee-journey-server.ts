import { createAdminClient } from '@/lib/supabase/server'
import { deriveAwardeeJourney, type AwardeeJourneyInput } from './awardee-journey'
import {
  DEFAULT_AWARDEE_JOURNEY_SETTINGS,
  type AwardeeJourneySettings,
} from './awardee-journey-settings'

type ProgressPatch = {
  welcomeRead?: true
  externalShareConfirmed?: boolean
  externalSharePlatform?: 'linkedin' | 'facebook' | 'instagram' | 'other'
  top100MomentComplete?: true
  whatsappChannelJoined?: true
  handbookPromptSeen?: true
  handbookRead?: true
  homeScreenAdded?: true
  introPublished?: true
}

type JourneyPayload = {
  state: ReturnType<typeof deriveAwardeeJourney>
  settings: AwardeeJourneySettings
  whatsappChannelJoinedAt: string | null
  moment: {
    completedAt: string | null
  }
  handbook: {
    eligible: boolean
    promptSeenAt: string | null
    readAt: string | null
  }
  homeScreenAddedAt: string | null
  introPublishedConfirmedAt: string | null
}

export function settingsFromRows(settingsRow: any, campaignRow: any): AwardeeJourneySettings {
  const defaults = DEFAULT_AWARDEE_JOURNEY_SETTINGS
  return {
    founderName: settingsRow?.founder_name || defaults.founderName,
    founderTitle: settingsRow?.founder_title || defaults.founderTitle,
    founderLinkedinUrl: settingsRow?.founder_linkedin_url || defaults.founderLinkedinUrl,
    welcomeTitle: settingsRow?.welcome_title || defaults.welcomeTitle,
    welcomeBody: settingsRow?.welcome_body?.trim() || defaults.welcomeBody,
    signatureText: settingsRow?.signature_text || defaults.signatureText,
    organizationLinkedinUrl: settingsRow?.organization_linkedin_url || defaults.organizationLinkedinUrl,
    facebookUrl: settingsRow?.facebook_url || defaults.facebookUrl,
    instagramUrl: settingsRow?.instagram_url || defaults.instagramUrl,
    flyerTemplateUrl: settingsRow?.flyer_template_url || defaults.flyerTemplateUrl,
    cohortYear: Number(settingsRow?.cohort_year ?? defaults.cohortYear),
    selectedAwardeeCount: Number(settingsRow?.selected_awardee_count ?? defaults.selectedAwardeeCount),
    applicantCount: Number(settingsRow?.applicant_count ?? defaults.applicantCount),
    applicantCountryCount: Number(settingsRow?.applicant_country_count ?? defaults.applicantCountryCount),
    magazineCampaign: {
      id: campaignRow?.id || settingsRow?.magazine_campaign_id || defaults.magazineCampaign.id,
      title: campaignRow?.title || defaults.magazineCampaign.title,
      description: campaignRow?.description || defaults.magazineCampaign.description,
      ngnAmountMinor: Number(campaignRow?.ngn_amount_minor ?? defaults.magazineCampaign.ngnAmountMinor),
      usdAmountMinor: Number(campaignRow?.usd_amount_minor ?? defaults.magazineCampaign.usdAmountMinor),
      priceVersion: campaignRow?.price_version || defaults.magazineCampaign.priceVersion,
      applicationOpen: campaignRow?.application_open ?? defaults.magazineCampaign.applicationOpen,
    },
  }
}

function failOnDbError(label: string, error: unknown) {
  if (error) {
    console.error(`[awardee-journey] ${label} query failed`)
    throw new Error('Could not load your onboarding journey. Please try again shortly.')
  }
}

function isMissingRpcFunction(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const value = error as { code?: unknown; message?: unknown }
  return value.code === 'PGRST202'
    || value.code === '42883'
    || (typeof value.message === 'string' && /could not find the function|function .* does not exist/i.test(value.message))
}

export async function getAwardeeJourneyForMember(memberId: string): Promise<JourneyPayload> {
  const db = createAdminClient()
  const [{ data, error }, { data: whatsappChannelJoinedAt, error: whatsappError }, { data: profilePrefs }, { data: manualProgress, error: manualProgressError }] = await Promise.all([
    db.rpc('get_awardee_journey_data', { p_profile_id: memberId }),
    db.rpc('get_awardee_whatsapp_channel_joined_at', { p_profile_id: memberId }),
    db.from('profiles').select('notification_prefs').eq('id', memberId).maybeSingle(),
    db.rpc('get_awardee_journey_manual_progress', { p_profile_id: memberId }),
  ])
  failOnDbError('journey', error)
  failOnDbError('WhatsApp journey progress', whatsappError)
  if (manualProgressError && !isMissingRpcFunction(manualProgressError)) {
    failOnDbError('manual journey progress', manualProgressError)
  }
  const payload = data as Record<string, any> | null
  const profile = payload?.profile
  if (!profile) throw new Error('Member profile not found.')
  const fallbackPrefs = (profilePrefs?.notification_prefs ?? {}) as Record<string, unknown>
  const homeScreenAddedAt = manualProgress?.home_screen_added_at
    ?? (typeof fallbackPrefs.homeScreenAddedAt === 'string' ? fallbackPrefs.homeScreenAddedAt : null)
  const introPublishedConfirmedAt = manualProgress?.intro_published_confirmed_at
    ?? (typeof fallbackPrefs.introPublishedConfirmedAt === 'string' ? fallbackPrefs.introPublishedConfirmedAt : null)
  const handbookPromptSeenAt = payload.progress?.handbook_prompt_seen_at
    ?? (typeof fallbackPrefs.handbookPromptSeenAt === 'string' ? fallbackPrefs.handbookPromptSeenAt : null)
  const handbookReadAt = payload.progress?.handbook_read_at
    ?? (typeof fallbackPrefs.handbookReadAt === 'string' ? fallbackPrefs.handbookReadAt : null)

  const settings = settingsFromRows(payload.settings, payload.campaign)
  const paymentStatus = payload.magazine_order?.status ?? 'unpaid'
  const input: AwardeeJourneyInput = {
    profile: {
      fullName: profile.full_name ?? '',
      headline: profile.headline ?? '',
      bio: profile.bio ?? '',
      location: profile.location ?? '',
      organization: profile.organization ?? '',
      field: profile.field ?? '',
      avatarUrl: profile.avatar_url ?? null,
    },
    welcomeReadAt: payload.progress?.welcome_read_at ?? null,
    // Access to this public programme guide is available to every signed-in
    // member. The RPC's original cohort/approval flag is retained for DB
    // compatibility but does not gate the member-facing handbook.
    handbookEligible: true,
    handbookPromptSeenAt,
    handbookReadAt,
    introPublishedConfirmedAt,
    hasPublishedIntroPost: payload.has_published_intro_post === true,
    externalShareConfirmedAt: payload.progress?.external_share_confirmed_at ?? null,
    externalSharePlatform: payload.progress?.external_share_platform ?? null,
    magazine: {
      paymentStatus,
      applicationStatus: payload.application?.status ?? null,
    },
    award: {
      paymentStatus: payload.award_order?.award_payment_status ?? (payload.award_order?.status === 'paid' ? 'paid' : 'unpaid'),
      certificateAvailable: false,
    },
  }
  return {
    state: deriveAwardeeJourney(input),
    settings,
    moment: {
      completedAt: payload?.progress?.top100_moment_completed_at ?? null,
    },
    whatsappChannelJoinedAt: typeof whatsappChannelJoinedAt === 'string' ? whatsappChannelJoinedAt : null,
    handbook: {
      eligible: true,
      promptSeenAt: handbookPromptSeenAt,
      readAt: handbookReadAt,
    },
    homeScreenAddedAt,
    introPublishedConfirmedAt,
  }
}

export async function saveAwardeeJourneyProgress(memberId: string, patch: ProgressPatch): Promise<void> {
  const db = createAdminClient()
  const hasExistingProgress = patch.welcomeRead !== undefined
    || patch.externalShareConfirmed !== undefined
    || patch.top100MomentComplete !== undefined
    || patch.handbookPromptSeen !== undefined
    || patch.handbookRead !== undefined
  if (hasExistingProgress) {
    const progressArgs = {
      p_profile_id: memberId,
      p_welcome_read: patch.welcomeRead ?? false,
      p_external_share_confirmed: patch.externalShareConfirmed ?? null,
      p_external_share_platform: patch.externalShareConfirmed === true ? patch.externalSharePlatform ?? 'other' : null,
      p_top100_moment_complete: patch.top100MomentComplete ?? false,
      ...(patch.handbookPromptSeen ? { p_handbook_prompt_seen: true } : {}),
      ...(patch.handbookRead ? { p_handbook_read: true } : {}),
    }
    const { error } = await db.rpc('save_awardee_onboarding_progress', {
      ...progressArgs,
    })
    if (error) {
      const onlyHandbookProgress = patch.welcomeRead === undefined
        && patch.externalShareConfirmed === undefined
        && patch.top100MomentComplete === undefined
        && patch.whatsappChannelJoined === undefined
        && (patch.handbookPromptSeen === true || patch.handbookRead === true)
      if (!onlyHandbookProgress) failOnDbError('progress update', error)

      // The original profile-preferences JSON exists on older installations.
      // Use its atomic merge RPC until the onboarding-progress migration lands.
      const now = new Date().toISOString()
      const preferencePatch: Record<string, string> = {}
      if (patch.handbookPromptSeen) preferencePatch.handbookPromptSeenAt = now
      if (patch.handbookRead) preferencePatch.handbookReadAt = now
      const { error: fallbackError } = await db.rpc('merge_profile_notification_prefs', {
        p_profile_id: memberId,
        p_patch: preferencePatch,
      })
      failOnDbError('handbook preference update', fallbackError)
    }
  }
  if (patch.whatsappChannelJoined) {
    const { error } = await db.rpc('mark_awardee_whatsapp_channel_joined', { p_profile_id: memberId })
    failOnDbError('WhatsApp progress update', error)
  }
  if (patch.homeScreenAdded || patch.introPublished) {
    const { error } = await db.rpc('mark_awardee_journey_tasks', {
      p_profile_id: memberId,
      p_home_screen_added: patch.homeScreenAdded ?? false,
      p_intro_published: patch.introPublished ?? false,
    })
    if (error) {
      if (!isMissingRpcFunction(error)) failOnDbError('manual journey progress update', error)
      const now = new Date().toISOString()
      const preferencePatch: Record<string, string> = {}
      if (patch.homeScreenAdded) preferencePatch.homeScreenAddedAt = now
      if (patch.introPublished) preferencePatch.introPublishedConfirmedAt = now
      const { error: fallbackError } = await db.rpc('merge_profile_notification_prefs', {
        p_profile_id: memberId,
        p_patch: preferencePatch,
      })
      failOnDbError('manual journey preference update', fallbackError)
    }
  }
}
