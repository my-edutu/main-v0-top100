import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { settingsFromRows } from '@/lib/dashboard/awardee-journey-server'
import { validateAwardeeJourneySettings } from '@/lib/dashboard/awardee-journey-settings'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error

  const db = createAdminClient()
  const { data: settings, error: settingsError } = await db
    .from('awardee_onboarding_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle()
  if (settingsError) return NextResponse.json({ message: 'Could not load onboarding settings.' }, { status: 503 })

  const campaignId = settings?.magazine_campaign_id || 'afl-magazine-2026'
  const { data: campaign, error: campaignError } = await db
    .from('magazine_feature_campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle()
  if (campaignError) return NextResponse.json({ message: 'Could not load magazine campaign settings.' }, { status: 503 })

  return NextResponse.json({ settings: settingsFromRows(settings, campaign) })
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }
  const validation = validateAwardeeJourneySettings(body)
  if (!validation.ok) return NextResponse.json({ message: validation.error }, { status: 400 })

  const settings = validation.value
  const db = createAdminClient()
  const { data: existingCampaign, error: readError } = await db
    .from('magazine_feature_campaigns')
    .select('ngn_amount_minor,usd_amount_minor,price_version')
    .eq('id', settings.magazineCampaign.id)
    .maybeSingle()
  if (readError) return NextResponse.json({ message: 'Could not verify the current magazine prices.' }, { status: 503 })

  const pricesChanged = existingCampaign !== null && existingCampaign !== undefined && (
    Number(existingCampaign.ngn_amount_minor) !== settings.magazineCampaign.ngnAmountMinor
    || Number(existingCampaign.usd_amount_minor) !== settings.magazineCampaign.usdAmountMinor
  )
  const priceVersion = pricesChanged
    ? `${existingCampaign.price_version}-r${Date.now()}`
    : existingCampaign?.price_version || settings.magazineCampaign.priceVersion

  const { error: campaignError } = await db.from('magazine_feature_campaigns').upsert({
    id: settings.magazineCampaign.id,
    title: settings.magazineCampaign.title,
    description: settings.magazineCampaign.description,
    ngn_amount_minor: settings.magazineCampaign.ngnAmountMinor,
    usd_amount_minor: settings.magazineCampaign.usdAmountMinor,
    price_version: priceVersion,
    application_open: settings.magazineCampaign.applicationOpen,
  }, { onConflict: 'id' })
  if (campaignError) return NextResponse.json({ message: 'Could not save the magazine campaign.' }, { status: 503 })

  const { error: settingsError } = await db.from('awardee_onboarding_settings').upsert({
    id: true,
    founder_name: settings.founderName,
    founder_title: settings.founderTitle,
    founder_linkedin_url: settings.founderLinkedinUrl,
    welcome_title: settings.welcomeTitle,
    welcome_body: settings.welcomeBody,
    signature_text: settings.signatureText,
    organization_linkedin_url: settings.organizationLinkedinUrl,
    facebook_url: settings.facebookUrl,
    instagram_url: settings.instagramUrl,
    flyer_template_url: settings.flyerTemplateUrl,
    cohort_year: settings.cohortYear,
    selected_awardee_count: settings.selectedAwardeeCount,
    applicant_count: settings.applicantCount,
    applicant_country_count: settings.applicantCountryCount,
    magazine_campaign_id: settings.magazineCampaign.id,
  }, { onConflict: 'id' })
  if (settingsError) return NextResponse.json({ message: 'Campaign saved, but onboarding content could not be saved. Please retry.' }, { status: 503 })

  return NextResponse.json({ settings: { ...settings, magazineCampaign: { ...settings.magazineCampaign, priceVersion } } })
}
