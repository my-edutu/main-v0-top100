import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260824093000_create_selection_ranking_runs.sql'),
  'utf8',
)

const rpcMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260824094000_create_selection_ranking_rpc.sql'),
  'utf8',
)

describe('selection ranking database security', () => {
  it('creates private ranking runs, entries and approvals', () => {
    for (const table of [
      'selection_ranking_runs',
      'selection_ranking_entries',
      'selection_ranking_approvals',
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`)
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`)
      expect(migration).toContain(`REVOKE ALL ON TABLE public.${table} FROM anon, authenticated`)
    }
  })

  it('requires two independent approvals before a ranking run can be approved', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.refresh_selection_ranking_approval_status')
    expect(migration).toContain('count(DISTINCT approver_id)')
    expect(migration).toContain('>= 2')
  })

  it('prevents editing ranking entries after a run is frozen', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.prevent_frozen_selection_ranking_entry_mutation')
    expect(migration).toContain("run_status <> 'draft'")
    expect(migration).toContain('Ranking entries are immutable after the run is frozen')
  })

  it('stores one deterministic rank per application and run', () => {
    expect(migration).toContain('UNIQUE (run_id, application_id)')
    expect(migration).toContain('UNIQUE (run_id, overall_rank)')
    expect(migration).toContain('UNIQUE (run_id, country, country_rank)')
  })

  it('persists the run and all entries atomically through a service-role-only RPC', () => {
    expect(rpcMigration).toContain('CREATE OR REPLACE FUNCTION public.create_frozen_selection_ranking_run')
    expect(rpcMigration).toContain('jsonb_to_recordset(p_entries)')
    expect(rpcMigration).toContain('GET DIAGNOSTICS v_entry_count = ROW_COUNT')
    expect(rpcMigration).toContain('ranking entry count mismatch')
    expect(rpcMigration).toContain('SECURITY INVOKER')
    expect(rpcMigration).toContain('FROM PUBLIC, anon, authenticated')
    expect(rpcMigration).toContain('TO service_role')
  })
})
