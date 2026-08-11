import type { MemberProfile } from '@/lib/member-hub'

function checked(form: FormData, name: string) {
  return form.get(name) === 'on'
}

export function buildBioPatch(
  form: FormData,
): Pick<MemberProfile, 'headline' | 'bio' | 'location' | 'organization' | 'field' | 'emailVisible' | 'recruiterVisible'> {
  return {
    headline: String(form.get('headline') || ''),
    bio: String(form.get('bio') || ''),
    location: String(form.get('location') || ''),
    organization: String(form.get('organization') || ''),
    field: String(form.get('field') || ''),
    emailVisible: checked(form, 'emailVisible'),
    recruiterVisible: checked(form, 'recruiterVisible'),
  }
}

export function buildVisibilityPatch(
  form: FormData,
): Pick<MemberProfile, 'showInDirectory' | 'allowDirectMessages'> {
  return {
    showInDirectory: checked(form, 'showInDirectory'),
    allowDirectMessages: checked(form, 'allowDirectMessages'),
  }
}

export function buildNotificationPatch(
  form: FormData,
): Pick<MemberProfile, 'opportunityAlerts' | 'magazineAlerts' | 'messageAlerts' | 'eventReminders'> {
  return {
    opportunityAlerts: checked(form, 'opportunityAlerts'),
    magazineAlerts: checked(form, 'magazineAlerts'),
    messageAlerts: checked(form, 'messageAlerts'),
    eventReminders: checked(form, 'eventReminders'),
  }
}

export function buildPrivacyPatch(
  form: FormData,
): Pick<MemberProfile, 'hideEmailFromRecruiters' | 'requireProfileApproval' | 'securityEmails'> {
  return {
    hideEmailFromRecruiters: checked(form, 'hideEmailFromRecruiters'),
    requireProfileApproval: checked(form, 'requireProfileApproval'),
    securityEmails: checked(form, 'securityEmails'),
  }
}
