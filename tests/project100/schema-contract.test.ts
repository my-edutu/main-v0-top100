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
  })
})
