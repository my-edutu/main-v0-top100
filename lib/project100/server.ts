import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/server'

import type {
  Project100Application,
  Project100ApplicationDraft,
  Project100ApplicationRow,
  Project100Schedule,
  Project100ScheduleRow,
} from './types'
import {
  project100SubmissionSchema,
  serializeProject100Application,
  serializeProject100Schedule,
} from './validation'

const APPLICATION_COLUMNS = 'id, member_id, status, full_name, phone, country, location, interest, area_of_function, team_lead_preference, resource_support_needs, consent, consented_at, submitted_at, created_at, updated_at'

export type MemberProject100Application = Omit<Project100Application, 'memberId'>

export type MemberProject100View = {
  schedule: Project100Schedule
  application: MemberProject100Application | null
  canEdit: boolean
}

function mapApplication(row: Project100ApplicationRow): MemberProject100Application {
  const { memberId: _memberId, ...application } = serializeProject100Application(row)
  return application
}

function draftColumns(draft: Partial<Project100ApplicationDraft>) {
  const columns: Record<string, string | boolean | null | undefined> = {}
  if (draft.fullName !== undefined) columns.full_name = draft.fullName
  if (draft.phone !== undefined) columns.phone = draft.phone
  if (draft.country !== undefined) columns.country = draft.country
  if (draft.location !== undefined) columns.location = draft.location
  if (draft.interest !== undefined) columns.interest = draft.interest
  if (draft.areaOfFunction !== undefined) columns.area_of_function = draft.areaOfFunction
  if (draft.teamLeadPreference !== undefined) columns.team_lead_preference = draft.teamLeadPreference
  if (draft.resourceSupportNeeds !== undefined) columns.resource_support_needs = draft.resourceSupportNeeds
  if (draft.consent !== undefined) columns.consent = draft.consent
  return columns
}

function submissionAnswers(application: MemberProject100Application) {
  return {
    fullName: application.fullName,
    phone: application.phone,
    country: application.country,
    location: application.location,
    interest: application.interest,
    areaOfFunction: application.areaOfFunction,
    teamLeadPreference: application.teamLeadPreference,
    resourceSupportNeeds: application.resourceSupportNeeds,
    consent: application.consent,
  }
}

function isOpen(schedule: Project100Schedule) {
  return Date.now() <= Date.parse(schedule.applicationDeadline)
}

function assertOpen(schedule: Project100Schedule) {
  if (!isOpen(schedule)) throw new Error('Project100 applications are closed')
}

async function loadSchedule(): Promise<Project100Schedule> {
  // The schedule is intentionally read by the service client: no member RLS
  // policy exposes settings, and this is the only member-facing admin read.
  const { data, error } = await createAdminClient()
    .from('project100_settings')
    .select('application_deadline, kickoff_at, updated_at')
    .eq('id', true)
    .maybeSingle()
  if (error || !data) throw new Error('Could not load the Project100 schedule')
  return serializeProject100Schedule(data as Project100ScheduleRow)
}

function memberClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase is not configured')
  // getServerSession verified this exact token before this client is created.
  // Supplying it as an Authorization header makes the database apply member
  // RLS for both cookie and bearer-authenticated requests.
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

async function loadApplication(memberId: string, accessToken: string) {
  const db = memberClient(accessToken)
  const { data, error } = await db
    .from('project100_applications')
    .select(APPLICATION_COLUMNS)
    .eq('member_id', memberId)
    .maybeSingle()
  if (error) throw new Error('Could not load your Project100 application')
  return data as Project100ApplicationRow | null
}

function view(schedule: Project100Schedule, application: Project100ApplicationRow | null): MemberProject100View {
  return {
    schedule,
    application: application ? mapApplication(application) : null,
    canEdit: isOpen(schedule) && (!application || application.status === 'draft'),
  }
}

export async function loadMemberProject100(memberId: string, accessToken: string): Promise<MemberProject100View> {
  const [schedule, application] = await Promise.all([loadSchedule(), loadApplication(memberId, accessToken)])
  return view(schedule, application)
}

export async function saveMemberProject100Draft(
  memberId: string,
  draft: Partial<Project100ApplicationDraft>,
  accessToken: string,
): Promise<MemberProject100View> {
  const schedule = await loadSchedule()
  assertOpen(schedule)
  const db = memberClient(accessToken)
  const existing = await loadApplication(memberId, accessToken)
  if (existing?.status === 'submitted') throw new Error('Project100 application has already been submitted')

  const columns = draftColumns(draft)
  let data: Project100ApplicationRow | null = null
  let error: { message?: string } | null = null
  if (existing) {
    const result = await db
      .from('project100_applications')
      .update(columns)
      .eq('member_id', memberId)
      .eq('status', 'draft')
      .select(APPLICATION_COLUMNS)
      .maybeSingle()
    data = result.data as Project100ApplicationRow | null
    error = result.error
  } else {
    const result = await db
      .from('project100_applications')
      .insert({ member_id: memberId, ...columns })
      .select(APPLICATION_COLUMNS)
      .single()
    data = result.data as Project100ApplicationRow | null
    error = result.error
  }
  if (error || !data) throw new Error('Could not save your Project100 draft')
  return view(schedule, data)
}

export async function submitMemberProject100(memberId: string, accessToken: string): Promise<MemberProject100View> {
  const schedule = await loadSchedule()
  assertOpen(schedule)
  const existing = await loadApplication(memberId, accessToken)
  if (!existing) throw new Error('Complete every required field before submitting')
  if (existing.status !== 'draft') throw new Error('Project100 application has already been submitted')

  project100SubmissionSchema.parse(submissionAnswers(mapApplication(existing)))

  const db = memberClient(accessToken)
  const { data, error } = await db.rpc('submit_project100_application')
  if (error || !data) throw new Error(error?.message ?? 'Could not submit your Project100 application')
  return view(schedule, data as Project100ApplicationRow)
}
