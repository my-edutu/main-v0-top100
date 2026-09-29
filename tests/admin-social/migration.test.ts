import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260926003251_admin_awardee_social_sharing.sql', 'utf8').toLowerCase()

describe('admin awardee social sharing migration', () => {
  it('constrains platform, status, awardee/platform uniqueness, and audit links', () => {
    expect(migration).toContain('create table public.admin_social_share_drafts')
    expect(migration).toContain("platform in ('linkedin', 'facebook', 'instagram')")
    expect(migration).toContain("status in ('draft', 'marked_posted')")
    expect(migration).toContain('create unique index admin_social_share_one_draft_per_platform_idx')
    expect(migration).toContain("where status = 'draft'")
    expect(migration).toContain('on public.admin_social_share_drafts(awardee_id, platform)')
    expect(migration).toContain('references public.awardees(id)')
    expect(migration).toContain('references auth.users(id)')
  })

  it('enables RLS and grants no direct access to browser roles', () => {
    expect(migration).toContain('enable row level security')
    expect(migration).toMatch(/revoke all .* from public, anon, authenticated/)
    expect(migration).toMatch(/grant all .* to service_role/)
    expect(migration).not.toMatch(/create policy .*admin_social_share_drafts/i)
  })
})
