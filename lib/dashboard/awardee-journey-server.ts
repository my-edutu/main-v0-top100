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
}

type JourneyPayload = {
  state: ReturnType<typeof deriveAwardeeJourney>
  settings: AwardeeJourneySettings
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
  const [profileResult, progressResult, settingsResult] = await Promise.all([
    db.from('profiles')
      .select('id,full_name,headline,bio,location,organization,field,avatar_url')
      .eq('id', memberId)
      .maybeSingle(),
    db.from('awardee_onboarding_progress')
      .select('welcome_read_at,external_share_confirmed_at,external_share_platform')
      .eq('profile_id', memberId)
      .maybeSingle(),
    db.from('awardee_onboarding_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle(),
  ])
  failOnDbError('profile', profileResult.error)
  failOnDbError('progress', progressResult.error)
  failOnDbError('settings', settingsResult.error)
  if (!profileResult.data) throw new Error('Member profile not found.')

  const rawSettings = settingsResult.data
  const campaignId = rawSettings?.magazine_campaign_id || DEFAULT_AWARDEE_JOURNEY_SETTINGS.magazineCampaign.id
  const [postsResult, campaignResult, magazineOrderResult, applicationResult, awardResult] = await Promise.all([
    db.from('member_posts')
      .select('status,tags')
      .eq('profile_id', memberId)
      .eq('status', 'published')
      .limit(100),
    db.from('magazine_feature_campaigns')
      .select('id,title,description,ngn_amount_minor,usd_amount_minor,price_version,application_open')
      .eq('id', campaignId)
      .maybeSingle(),
    db.from('magazine_feature_orders')
      .select('status')
      .eq('profile_id', memberId)
      .eq('campaign_id', campaignId)
      .maybeSingle(),
    db.from('magazine_feature_applications')
      .select('status')
      .eq('profile_id', memberId)
      .eq('campaign_id', campaignId)
      .maybeSingle(),
    db.from('award_orders')
      .select('award_payment_status,status')
      .eq('profile_id', memberId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  failOnDbError('posts', postsResult.error)
  failOnDbError('campaign', campaignResult.error)
  failOnDbError('magazine payment', magazineOrderResult.error)
  failOnDbError('magazine application', applicationResult.error)
  // Award tables can be absent in older local previews; that state is unknown,
  // never inferred as paid or certificate-ready.
  const awardOrder = awardResult.error ? null : awardResult.data
  const settings = settingsFromRows(rawSettings, campaignResult.data)
  const introPost = (postsResult.data ?? []).some((post: any) =>
    Array.isArray(post.tags) && post.tags.includes('afl-introduction'),
  )
  const paymentStatus = magazineOrderResult.data?.status ?? 'unpaid'
  const input: AwardeeJourneyInput = {
    profile: {
      fullName: profileResult.data.full_name ?? '',
      headline: profileResult.data.headline ?? '',
      bio: profileResult.data.bio ?? '',
      location: profileResult.data.location ?? '',
      organization: profileResult.data.organization ?? '',
      field: profileResult.data.field ?? '',
      avatarUrl: profileResult.data.avatar_url ?? null,
    },
    welcomeReadAt: progressResult.data?.welcome_read_at ?? null,
    hasPublishedIntroPost: introPost,
    externalShareConfirmedAt: progressResult.data?.external_share_confirmed_at ?? null,
    externalSharePlatform: progressResult.data?.external_share_platform ?? null,
    magazine: {
      paymentStatus,
      applicationStatus: applicationResult.data?.status ?? null,
    },
    award: {
      paymentStatus: awardOrder?.award_payment_status ?? (awardOrder?.status === 'paid' ? 'paid' : 'unpaid'),
      certificateAvailable: false,
    },
  }

  return { state: deriveAwardeeJourney(input), settings }
}

export async function saveAwardeeJourneyProgress(memberId: string, patch: ProgressPatch): Promise<void> {
  const db = createAdminClient()
  const { data: current, error: readError } = await db
    .from('awardee_onboarding_progress')
    .select('welcome_read_at,external_share_confirmed_at,external_share_platform')
    .eq('profile_id', memberId)
    .maybeSingle()
  failOnDbError('progress', readError)

  const next = {
    profile_id: memberId,
    welcome_read_at: patch.welcomeRead ? current?.welcome_read_at || new Date().toISOString() : current?.welcome_read_at ?? null,
    external_share_confirmed_at: current?.external_share_confirmed_at ?? null,
    external_share_platform: current?.external_share_platform ?? null,
  }
  if (patch.externalShareConfirmed === true) {
    next.external_share_confirmed_at = new Date().toISOString()
    next.external_share_platform = patch.externalSharePlatform ?? 'other'
  } else if (patch.externalShareConfirmed === false) {
    next.external_share_confirmed_at = null
    next.external_share_platform = null
  }

  const { error } = await db.from('awardee_onboarding_progress').upsert(next, { onConflict: 'profile_id' })
  failOnDbError('progress update', error)
}
