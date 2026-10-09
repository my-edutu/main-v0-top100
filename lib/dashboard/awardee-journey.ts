import { PARTICIPANT_HANDBOOK } from '@/lib/handbook/participant-handbook'

export type AwardeeJourneyInput = {
  profile: {
    fullName: string
    headline: string
    bio: string
    location: string
    organization: string
    field: string
    avatarUrl: string | null
  }
  welcomeReadAt: string | null
  handbookEligible?: boolean
  handbookReadAt?: string | null
  handbookPromptSeenAt?: string | null
  hasPublishedIntroPost: boolean
  externalShareConfirmedAt: string | null
  externalSharePlatform: string | null
  magazine: { paymentStatus: string; applicationStatus: string | null }
  award: { paymentStatus: string; certificateAvailable: boolean }
}

export type JourneyStep = {
  id: string
  label: string
  complete: boolean
  status: string
}

export type AwardeeJourneyState = {
  progress: { completed: number; total: number; percent: number }
  nextStepId: string | null
  coreSteps: JourneyStep[]
  recommendedActions: JourneyStep[]
  shareConfirmation: { platform: string; label: 'Marked complete by you' } | null
}

function isPersisted(value: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function deriveAwardeeJourney(input: AwardeeJourneyInput): AwardeeJourneyState {
  const welcomeComplete = isPersisted(input.welcomeReadAt)
  // These are the two requirements named by the dashboard checklist. Other
  // profile details (headline, location, organization, field) are optional.
  const profileComplete = Boolean(input.profile.bio.trim() && input.profile.avatarUrl?.trim())
  const introductionComplete = input.hasPublishedIntroPost
  const coreSteps: JourneyStep[] = [
    {
      id: 'welcome',
      label: 'Read your welcome from Paul Light',
      complete: welcomeComplete,
      status: welcomeComplete ? 'Read' : 'A note from our founder',
    },
    {
      id: 'profile',
      label: 'Complete your profile and upload a photo',
      complete: profileComplete,
      status: profileComplete ? 'Profile ready' : 'Add your BIO and profile photo',
    },
    {
      id: 'introduction',
      label: 'Publish your awardee introduction',
      complete: introductionComplete,
      status: introductionComplete ? 'Published' : 'Create your introduction post',
    },
  ]
  if (input.handbookEligible) {
    const handbookRead = isPersisted(input.handbookReadAt ?? null)
    coreSteps.push({
      id: 'handbook',
      label: PARTICIPANT_HANDBOOK.checklistTitle,
      complete: handbookRead,
      status: handbookRead ? 'Read' : 'Open the participant guide',
    })
  }
  const completed = coreSteps.filter((step) => step.complete).length
  const nextStepId = coreSteps.find((step) => !step.complete)?.id ?? null
  const applicationStatus = input.magazine.applicationStatus
  let magazineStatus = 'Explore the feature'
  if (applicationStatus === 'pending') magazineStatus = 'Application submitted'
  else if (applicationStatus === 'reviewing') magazineStatus = 'In editorial review'
  else if (applicationStatus === 'approved') magazineStatus = 'Feature approved'
  else if (applicationStatus === 'published') magazineStatus = 'Featured'
  else if (input.magazine.paymentStatus === 'paid') magazineStatus = 'Payment confirmed — apply now'
  else if (input.magazine.paymentStatus === 'pending') magazineStatus = 'Confirming payment'

  const awardStatus = input.award.certificateAvailable
    ? 'Certificate ready'
    : input.award.paymentStatus === 'paid'
      ? 'Award fee paid'
      : 'Award payment needed'

  return {
    progress: { completed, total: coreSteps.length, percent: Math.round((completed / coreSteps.length) * 100) },
    nextStepId,
    coreSteps,
    recommendedActions: [
      { id: 'opportunities', label: 'Discover opportunities', complete: false, status: 'Explore opportunities' },
      { id: 'magazine', label: 'Apply to be featured in the magazine', complete: applicationStatus !== null, status: magazineStatus },
      { id: 'award', label: 'Get your award', complete: input.award.certificateAvailable, status: awardStatus },
    ],
    shareConfirmation: input.externalShareConfirmedAt && input.externalSharePlatform
      ? { platform: input.externalSharePlatform, label: 'Marked complete by you' }
      : null,
  }
}
