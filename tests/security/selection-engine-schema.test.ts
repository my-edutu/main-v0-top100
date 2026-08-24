import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = [
  'supabase/migrations/20260824090000_create_selection_engine_foundation.sql',
  'supabase/migrations/20260824091000_add_selection_processing_tasks.sql',
]
  .map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'))
  .join('\n')

describe('selection engine database security', () => {
  it('creates separate private application and awardee selection tables', () => {
    for (const table of [
      'selection_cycles',
      'selection_jobs',
      'selection_applications',
      'selection_documents',
      'selection_processing_tasks',
      'selection_assessments',
      'selection_public_results',
      'selection_audit_events',
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`)
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`)
    }
  })

  it('revokes browser roles instead of exposing applicant documents through the Data API', () => {
    expect(migration).toContain('REVOKE ALL ON TABLE public.selection_applications FROM anon, authenticated')
    expect(migration).toContain('REVOKE ALL ON TABLE public.selection_documents FROM anon, authenticated')
    expect(migration).toContain('REVOKE ALL ON TABLE public.selection_processing_tasks FROM anon, authenticated')
    expect(migration).toContain('REVOKE ALL ON TABLE public.selection_assessments FROM anon, authenticated')
  })

  it('enforces the 100-record processing ceiling in the database', () => {
    expect(migration).toContain('batch_size integer NOT NULL DEFAULT 100')
    expect(migration).toContain('batch_size BETWEEN 1 AND 100')
  })

  it('claims worker tasks with row locks so concurrent workers cannot scan the same application', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.claim_selection_processing_tasks')
    expect(migration).toContain('FOR UPDATE SKIP LOCKED')
    expect(migration).toContain('LEAST(GREATEST(p_limit, 1), 10)')
  })

  it('creates a private PDF-only evidence bucket', () => {
    expect(migration).toContain("'selection-evidence'")
    expect(migration).toContain("ARRAY['application/pdf']")
    expect(migration).toContain('false')
  })
})
