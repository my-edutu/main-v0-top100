import { describe, expect, it } from 'vitest'
import {
  buildBioPatch,
  buildNotificationPatch,
  buildPrivacyPatch,
  buildVisibilityPatch,
} from '@/app/dashboard/_lib/profile-patches'

describe('dashboard profile patches', () => {
  it('does not reset settings that are absent from the BIO form', () => {
    const form = new FormData()
    form.set('headline', 'Climate founder')
    form.set('emailVisible', 'on')

    expect(buildBioPatch(form)).toEqual({
      headline: 'Climate founder',
      bio: '',
      location: '',
      organization: '',
      field: '',
      emailVisible: true,
      recruiterVisible: false,
    })
    expect(buildBioPatch(form)).not.toHaveProperty('messageAlerts')
    expect(buildBioPatch(form)).not.toHaveProperty('securityEmails')
  })

  it('keeps settings groups disjoint', () => {
    expect(Object.keys(buildVisibilityPatch(new FormData())).sort()).toEqual([
      'allowDirectMessages',
      'showInDirectory',
    ])
    expect(Object.keys(buildNotificationPatch(new FormData())).sort()).toEqual([
      'eventReminders',
      'magazineAlerts',
      'messageAlerts',
      'opportunityAlerts',
    ])
    expect(Object.keys(buildPrivacyPatch(new FormData())).sort()).toEqual([
      'hideEmailFromRecruiters',
      'requireProfileApproval',
      'securityEmails',
    ])
  })
})
