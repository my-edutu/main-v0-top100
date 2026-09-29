import { describe, expect, it } from 'vitest'
import { buildProfileUpdatePatch, getProfileWizardSteps } from '@/app/dashboard/_lib/profile-wizard'

describe('profile update wizard', () => {
  it('asks for one editable profile item at a time before visibility', () => {
    expect(getProfileWizardSteps(true)).toEqual([
      'photo',
      'headline',
      'field',
      'location',
      'organization',
      'bio',
      'visibility',
    ])
  })

  it('keeps photo and visibility updates available when BIO edits are exhausted', () => {
    expect(getProfileWizardSteps(false)).toEqual(['photo', 'visibility'])
  })

  it('does not send locked BIO fields when saving photo or visibility changes', () => {
    expect(buildProfileUpdatePatch({
      headline: 'A headline',
      field: 'Climate',
      location: 'Lagos',
      organization: 'A company',
      bio: 'A short bio',
      emailVisible: true,
      recruiterVisible: false,
    }, false)).toEqual({
      emailVisible: true,
      recruiterVisible: false,
    })
  })
})
