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
}

type JourneyPayload = {
  state: ReturnType<typeof deriveAwardeeJourney>
  settings: AwardeeJourneySettings
  moment: {
    completedAt: string | null
  }
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

export async function getAwardeeJourneyForMember(memberId: string): Promise<JourneyPayload> {
  const db = createAdminClient()
  const { data, error } = await db.rpc('get_awardee_journey_data', { p_profile_id: memberId })
  failOnDbError('journey', error)
  const payload = data as Record<string, any> | null
  const profile = payload?.profile
  if (!profile) throw new Error('Member profile not found.')

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
  }
}

export async function saveAwardeeJourneyProgress(memberId: string, patch: ProgressPatch): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.rpc('save_awardee_onboarding_progress', {
    p_profile_id: memberId,
    p_welcome_read: patch.welcomeRead ?? false,
    p_external_share_confirmed: patch.externalShareConfirmed ?? null,
    p_external_share_platform: patch.externalShareConfirmed === true ? patch.externalSharePlatform ?? 'other' : null,
    p_top100_moment_complete: patch.top100MomentComplete ?? false,
  })
  failOnDbError('progress update', error)
}
