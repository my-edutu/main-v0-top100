import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  PROJECT100_DEFAULT_APPLICATION_DEADLINE,
  PROJECT100_DEFAULT_KICKOFF_AT,
  project100SubmissionSchema,
} from '@/lib/project100/validation'

const sql = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '20260909120000_project100_scholarship.sql'),
  'utf8',
)
const securitySql = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '20260909123000_project100_scholarship_security.sql'),
  'utf8',
)

describe('Project100 Scholarship schema contract', () => {
  it('seeds the published default schedule', () => {
    expect(sql).toContain(PROJECT100_DEFAULT_APPLICATION_DEADLINE)
    expect(sql).toContain(PROJECT100_DEFAULT_KICKOFF_AT)
    expect(sql).toMatch(/insert into public\.project100_settings[\s\S]+on conflict \(id\) do nothing/i)
  })

  it('limits applications to the supported lifecycle values', () => {
    expect(sql).toMatch(/status text not null default 'draft' check \(status in \('draft', 'submitted'\)\)/i)
  })

  it('requires every application answer and explicit consent before submission', () => {
    const valid = {
      fullName: 'Ada Lovelace', phone: '+2348012345678', country: 'Nigeria', location: 'Lagos',
      interest: 'Education', areaOfFunction: 'Technology', teamLeadPreference: true,
      resourceSupportNeeds: 'Mentorship', consent: true,
    }
    expect(project100SubmissionSchema.safeParse(valid).success).toBe(true)
    for (const key of Object.keys(valid)) {
      const { [key]: _removed, ...incomplete } = valid
      expect(project100SubmissionSchema.safeParse(incomplete).success).toBe(false)
    }
    expect(sql).toMatch(/project100_applications_submitted_complete/i)
  })

  it('prevents duplicate group membership within a run', () => {
    expect(sql).toMatch(/unique \(group_id, application_id\)/i)
    expect(sql).toMatch(/unique \(run_id, application_id\)/i)
    expect(securitySql).toMatch(/foreign key \(run_id, group_id\)[\s\S]+references public\.project100_groups \(run_id, id\)/i)
  })

  it('allows only draft answer columns through member table grants', () => {
    expect(securitySql).toMatch(/revoke all privileges on table public\.project100_applications from authenticated/i)
    expect(securitySql).toMatch(/grant update \([\s\S]+resource_support_needs, consent[\s\S]+\) on table public\.project100_applications to authenticated/i)
    const updateColumns = securitySql.match(/grant update \(([\s\S]*?)\) on table public\.project100_applications to authenticated/i)?.[1] ?? ''
    expect(updateColumns).not.toMatch(/\bstatus\b/i)
    expect(updateColumns).not.toMatch(/\bsubmitted_at\b/i)
    expect(securitySql).toMatch(/with check \(auth\.uid\(\) = member_id and status = 'draft'\)/i)
  })

  it('uses a deadline-checked constrained submission RPC', () => {
    expect(securitySql).toMatch(/create or replace function public\.submit_project100_application\(\)/i)
    expect(securitySql).toMatch(/select application_deadline into v_deadline/i)
    expect(securitySql).toMatch(/now\(\) > v_deadline/i)
    expect(securitySql).toMatch(/set status = 'submitted', submitted_at = now\(\)/i)
    expect(securitySql).toMatch(/grant execute on function public\.submit_project100_application\(\) to authenticated/i)
  })
})
