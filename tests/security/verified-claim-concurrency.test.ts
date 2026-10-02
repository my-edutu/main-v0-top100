import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261001090000_verified_claim_concurrency.sql'),
  'utf8',
)

it('serializes concurrent claims for one member without serializing reusable invite codes', () => {
  expect(migration).toContain('pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0))')
  expect(migration).toContain('for share')
  expect(migration).toContain("if v_code.redemption_mode = 'single_use' then")
  expect(migration).toContain("if v_code.redemption_mode = 'single_use' then\n    update public.access_codes")
})
