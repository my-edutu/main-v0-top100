import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '20260909124000_project100_member_draft_deadline.sql'),
  'utf8',
)

describe('Project100 draft deadline database guard', () => {
  it('applies the authoritative deadline to member draft inserts and updates', () => {
    expect(migration).toMatch(/create or replace function public\.project100_application_deadline_open\(\)/i)
    expect(migration).toMatch(/clock_timestamp\(\) <= application_deadline/i)
    expect(migration).toMatch(/project100_member_create_own_draft[\s\S]+project100_application_deadline_open\(\)/i)
    expect(migration).toMatch(/project100_member_update_own_draft[\s\S]+using \([\s\S]+project100_application_deadline_open\(\)[\s\S]+with check \([\s\S]+project100_application_deadline_open\(\)/i)
  })
})
