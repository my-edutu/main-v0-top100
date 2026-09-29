export type AwardeeJourneySettings = {
  founderName: string
  founderTitle: string
  founderLinkedinUrl: string
  welcomeTitle: string
  welcomeBody: string
  signatureText: string
  organizationLinkedinUrl: string
  facebookUrl: string | null
  instagramUrl: string | null
  flyerTemplateUrl: string | null
  magazineCampaign: {
    id: string
    title: string
    description: string
    ngnAmountMinor: number
    usdAmountMinor: number
    priceVersion: string
    applicationOpen: boolean
  }
}

export const DEFAULT_AWARDEE_JOURNEY_SETTINGS: AwardeeJourneySettings = {
  founderName: 'Nwosu Paul Light',
  founderTitle: 'Founder, Africa Future Leaders',
  founderLinkedinUrl: 'https://www.linkedin.com/in/paul-light-/',
  welcomeTitle: 'Welcome to Africa Future Leaders.',
  welcomeBody: `Dear Africa Future Leader,\n\nCongratulations on earning your place in this community. Your recognition is an important milestone, but I hope you will see it as the beginning of a larger journey: the work of becoming more intentional about the people you serve, the ideas you contribute, and the change you help make possible.\n\nAfrica does not lack talent or ambition. We need more leaders who can turn both into enduring value—leaders who keep learning, build with others, make room for new voices, and stay with difficult problems long enough to create solutions that last. That is the standard this community invites each of us to pursue.\n\nUse this space to make your profile reflect who you are and what you are working toward. Share your ideas in your own voice. Explore opportunities with curiosity. Meet the other awardees, join the conversations, and offer the kind of help you would hope to receive. You do not need to have everything figured out before you begin; show up honestly, keep your commitments, and let your work speak over time.\n\nI am proud to welcome you. I look forward to seeing what you build, who you bring along, and how your leadership grows from here.`,
  signatureText: 'PAULLIGHT',
  organizationLinkedinUrl: 'https://www.linkedin.com/company/top100africa/',
  facebookUrl: null,
  instagramUrl: null,
  flyerTemplateUrl: null,
  magazineCampaign: {
    id: 'afl-magazine-2026',
    title: 'Africa Future Leaders Magazine Feature',
    description: 'Apply to share the story and impact behind your leadership. Payment covers editorial consideration and does not guarantee selection or publication.',
    ngnAmountMinor: 1_000_000,
    usdAmountMinor: 1_000,
    priceVersion: 'afl-magazine-2026-v1',
    applicationOpen: true,
  },
}

export type SettingsValidation =
  | { ok: true; value: AwardeeJourneySettings }
  | { ok: false; error: string }

function text(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length >= min && normalized.length <= max ? normalized : null
}

function httpsUrl(value: unknown, hosts?: string[]): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    if (hosts && !hosts.includes(url.hostname.toLowerCase())) return null
    return url.href
  } catch {
    return null
  }
}

function amount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 100 && value <= 100_000_000
}

export function validateAwardeeJourneySettings(input: unknown): SettingsValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Settings must be an object.' }
  }
  const value = input as Record<string, any>
  const campaign = value.magazineCampaign
  if (!campaign || typeof campaign !== 'object' || Array.isArray(campaign)) {
    return { ok: false, error: 'Magazine campaign settings are required.' }
  }

  const founderName = text(value.founderName, 2, 100)
  const founderTitle = text(value.founderTitle, 2, 140)
  const founderLinkedinUrl = httpsUrl(value.founderLinkedinUrl, ['linkedin.com', 'www.linkedin.com'])
  const welcomeTitle = text(value.welcomeTitle, 5, 120)
  const welcomeBody = text(value.welcomeBody, 100, 6000)
  const signatureText = text(value.signatureText, 2, 80)
  const organizationLinkedinUrl = httpsUrl(value.organizationLinkedinUrl, ['linkedin.com', 'www.linkedin.com'])
  const facebookUrl = value.facebookUrl === null || value.facebookUrl === ''
    ? null
    : httpsUrl(value.facebookUrl, ['facebook.com', 'www.facebook.com'])
  const instagramUrl = value.instagramUrl === null || value.instagramUrl === ''
    ? null
    : httpsUrl(value.instagramUrl, ['instagram.com', 'www.instagram.com'])
  const flyerTemplateUrl = value.flyerTemplateUrl === null || value.flyerTemplateUrl === ''
    ? null
    : httpsUrl(value.flyerTemplateUrl)
  const campaignId = text(campaign.id, 3, 64)
  const campaignTitle = text(campaign.title, 3, 140)
  const campaignDescription = text(campaign.description, 20, 2000)
  const priceVersion = text(campaign.priceVersion, 3, 80)

  if (!founderName || !founderTitle || !founderLinkedinUrl || !welcomeTitle || !welcomeBody || !signatureText
    || !organizationLinkedinUrl || (value.facebookUrl && !facebookUrl) || (value.instagramUrl && !instagramUrl)
    || (value.flyerTemplateUrl && !flyerTemplateUrl) || !campaignId || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(campaignId)
    || !campaignTitle || !campaignDescription || !priceVersion
    || !amount(campaign.ngnAmountMinor) || !amount(campaign.usdAmountMinor)
    || typeof campaign.applicationOpen !== 'boolean') {
    return { ok: false, error: 'Check the copy, HTTPS social links, campaign ID, and positive NGN/USD prices.' }
  }

  return {
    ok: true,
    value: {
      founderName,
      founderTitle,
      founderLinkedinUrl,
      welcomeTitle,
      welcomeBody,
      signatureText,
      organizationLinkedinUrl,
      facebookUrl,
      instagramUrl,
      flyerTemplateUrl,
      magazineCampaign: {
        id: campaignId,
        title: campaignTitle,
        description: campaignDescription,
        ngnAmountMinor: campaign.ngnAmountMinor,
        usdAmountMinor: campaign.usdAmountMinor,
        priceVersion,
        applicationOpen: campaign.applicationOpen,
      },
    },
  }
}
