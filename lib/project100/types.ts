export const PROJECT100_APPLICATION_STATUSES = ['draft', 'submitted'] as const

export type Project100ApplicationStatus = (typeof PROJECT100_APPLICATION_STATUSES)[number]

export type Project100Application = {
  id: string
  memberId: string
  status: Project100ApplicationStatus
  fullName: string | null
  phone: string | null
  country: string | null
  location: string | null
  interest: string | null
  areaOfFunction: string | null
  teamLeadPreference: boolean | null
  resourceSupportNeeds: string | null
  consent: boolean
  consentedAt: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Project100Schedule = {
  applicationDeadline: string
  kickoffAt: string
  updatedAt: string
}

export type Project100ApplicationDraft = Pick<
  Project100Application,
  | 'fullName'
  | 'phone'
  | 'country'
  | 'location'
  | 'interest'
  | 'areaOfFunction'
  | 'teamLeadPreference'
  | 'resourceSupportNeeds'
  | 'consent'
>

export type Project100ApplicationRow = {
  id: string
  member_id: string
  status: Project100ApplicationStatus
  full_name: string | null
  phone: string | null
  country: string | null
  location: string | null
  interest: string | null
  area_of_function: string | null
  team_lead_preference: boolean | null
  resource_support_needs: string | null
  consent: boolean
  consented_at: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export type Project100ScheduleRow = {
  application_deadline: string
  kickoff_at: string
  updated_at: string
}
