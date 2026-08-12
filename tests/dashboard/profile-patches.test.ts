import { describe, expect, it } from 'vitest'
import {
  buildBioPatch,
  buildNotificationPatch,
  buildPrivacyPatch,
  buildSettingsPatch,
  buildVisibilityPatch,
  saveSettingsForm,
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

  it('maps every visibility checkbox to its exact on and off value without preference leakage', () => {
    const checkedForm = new FormData()
    checkedForm.set('showInDirectory', 'on')
    checkedForm.set('allowDirectMessages', 'on')

    const uncheckedForm = new FormData()

    expect(buildVisibilityPatch(checkedForm)).toEqual({
      showInDirectory: true,
      allowDirectMessages: true,
    })
    expect(buildVisibilityPatch(uncheckedForm)).toEqual({
      showInDirectory: false,
      allowDirectMessages: false,
    })
    expect(buildVisibilityPatch(checkedForm)).not.toHaveProperty('opportunityAlerts')
    expect(buildVisibilityPatch(checkedForm)).not.toHaveProperty('hideEmailFromRecruiters')
  })

  it('maps every notification checkbox to its exact on and off value without preference leakage', () => {
    const checkedForm = new FormData()
    checkedForm.set('opportunityAlerts', 'on')
    checkedForm.set('magazineAlerts', 'on')
    checkedForm.set('messageAlerts', 'on')
    checkedForm.set('eventReminders', 'on')

    const uncheckedForm = new FormData()

    expect(buildNotificationPatch(checkedForm)).toEqual({
      opportunityAlerts: true,
      magazineAlerts: true,
      messageAlerts: true,
      eventReminders: true,
    })
    expect(buildNotificationPatch(uncheckedForm)).toEqual({
      opportunityAlerts: false,
      magazineAlerts: false,
      messageAlerts: false,
      eventReminders: false,
    })
    expect(buildNotificationPatch(checkedForm)).not.toHaveProperty('showInDirectory')
    expect(buildNotificationPatch(checkedForm)).not.toHaveProperty('securityEmails')
  })

  it('maps every privacy checkbox to its exact on and off value without preference leakage', () => {
    const checkedForm = new FormData()
    checkedForm.set('hideEmailFromRecruiters', 'on')
    checkedForm.set('requireProfileApproval', 'on')
    checkedForm.set('securityEmails', 'on')

    const uncheckedForm = new FormData()

    expect(buildPrivacyPatch(checkedForm)).toEqual({
      hideEmailFromRecruiters: true,
      requireProfileApproval: true,
      securityEmails: true,
    })
    expect(buildPrivacyPatch(uncheckedForm)).toEqual({
      hideEmailFromRecruiters: false,
      requireProfileApproval: false,
      securityEmails: false,
    })
    expect(buildPrivacyPatch(checkedForm)).not.toHaveProperty('showInDirectory')
    expect(buildPrivacyPatch(checkedForm)).not.toHaveProperty('messageAlerts')
  })

  it('builds the complete legacy Settings payload without BIO keys', () => {
    const form = new FormData()
    form.set('recruiterVisible', 'on')
    form.set('showInDirectory', 'on')
    form.set('magazineAlerts', 'on')
    form.set('eventReminders', 'on')
    form.set('hideEmailFromRecruiters', 'on')
    form.set('securityEmails', 'on')

    expect(buildSettingsPatch(form)).toEqual({
      recruiterVisible: true,
      emailVisible: false,
      showInDirectory: true,
      allowDirectMessages: false,
      opportunityAlerts: false,
      magazineAlerts: true,
      messageAlerts: false,
      eventReminders: true,
      hideEmailFromRecruiters: true,
      requireProfileApproval: false,
      securityEmails: true,
    })
    expect(buildSettingsPatch(form)).not.toHaveProperty('headline')
    expect(buildSettingsPatch(form)).not.toHaveProperty('bio')
  })

  it('sends the legacy Settings patch through the profile update boundary', async () => {
    const form = new FormData()
    form.set('emailVisible', 'on')
    form.set('allowDirectMessages', 'on')
    form.set('opportunityAlerts', 'on')
    form.set('requireProfileApproval', 'on')

    const originalFetch = globalThis.fetch
    let request: { input: RequestInfo | URL; init?: RequestInit } | undefined
    globalThis.fetch = async (input, init) => {
      request = { input, init }
      return new Response(JSON.stringify({ member: { id: 'member-7' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      await saveSettingsForm('member-7', form)
    } finally {
      globalThis.fetch = originalFetch
    }

    expect(request).toEqual({
      input: '/api/member/me',
      init: {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recruiterVisible: false,
          emailVisible: true,
          showInDirectory: false,
          allowDirectMessages: true,
          opportunityAlerts: true,
          magazineAlerts: false,
          messageAlerts: false,
          eventReminders: false,
          hideEmailFromRecruiters: false,
          requireProfileApproval: true,
          securityEmails: false,
        }),
      },
    })
  })
})
