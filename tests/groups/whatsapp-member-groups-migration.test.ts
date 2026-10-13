import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
const migrationName = readdirSync(migrationsDir).find((name) => /_whatsapp_member_groups\.sql$/.test(name))
const sql = migrationName ? readFileSync(join(migrationsDir, migrationName), 'utf8').toLowerCase() : ''

describe('WhatsApp member groups migration', () => {
  it('stores one allowlisted assignment per member behind service-role access', () => {
    expect(sql).toMatch(/create table if not exists public\.whatsapp_group_assignments/)
    expect(sql).toMatch(/profile_id uuid primary key references public\.profiles\s*\(id\)/)
    expect(sql).toMatch(/group_key text not null check[\s\S]+group-1[\s\S]+group-2[\s\S]+group-3/)
    expect(sql).toMatch(/assigned_at timestamptz not null default now\(\)/)
    expect(sql).toMatch(/alter table public\.whatsapp_group_assignments enable row level security/)
    expect(sql).toMatch(/revoke all on table public\.whatsapp_group_assignments from public, anon, authenticated/)
    expect(sql).toMatch(/grant all on table public\.whatsapp_group_assignments to service_role/)
  })

  it('delivers the stable Groups announcement once to approved members', () => {
    expect(sql).toContain('afl-whatsapp-member-groups')
    expect(sql).toContain('your afl whatsapp community is here')
    expect(sql).toContain('connect with fellow africa future leaders. open groups to discover your assigned whatsapp group.')
    expect(sql).toContain('discover your group')
    expect(sql).toContain("'/dashboard/discover/groups'")
    expect(sql).toMatch(/where\s+(?:profile\.)?role\s*=\s*'user'[\s\S]+membership_status\s*=\s*'approved'/)
    expect(sql).toMatch(/on conflict\s*\(user_id, campaign_id\)\s+do nothing/)
  })
})
