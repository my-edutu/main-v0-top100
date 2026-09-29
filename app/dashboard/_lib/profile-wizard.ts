export type ProfileEditStep =
  | 'photo'
  | 'headline'
  | 'field'
  | 'location'
  | 'organization'
  | 'bio'
  | 'visibility'

export type ProfileUpdateDraft = {
  headline: string
  field: string
  location: string
  organization: string
  bio: string
  emailVisible: boolean
  recruiterVisible: boolean
}

export function getProfileWizardSteps(canEditBio: boolean): ProfileEditStep[] {
  return canEditBio
    ? ['photo', 'headline', 'field', 'location', 'organization', 'bio', 'visibility']
    : ['photo', 'visibility']
}

export function buildProfileUpdatePatch(draft: ProfileUpdateDraft, canEditBio: boolean): ProfileUpdateDraft | Pick<ProfileUpdateDraft, 'emailVisible' | 'recruiterVisible'> {
  if (!canEditBio) {
    return {
      emailVisible: draft.emailVisible,
      recruiterVisible: draft.recruiterVisible,
    }
  }
  return { ...draft }
}
