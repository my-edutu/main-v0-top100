import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20261005160000_awardee_whatsapp_channel_progress.sql',
  'utf8',
).toLowerCase()

describe('awardee WhatsApp progress migration', () => {
  it('stores an idempotent completion timestamp in the existing member progress row', () => {
    expect(migration).toContain('add column if not exists whatsapp_channel_joined_at timestamptz')
    expect(migration).toContain('on conflict (profile_id) do update')
    expect(migration).toContain('coalesce(')
  })

  it('limits both completion read and write functions to the service role', () => {
    expect(migration.match(/grant execute on function/g)).toHaveLength(2)
    expect(migration).toContain('to service_role')
    expect(migration).toContain('from public, anon, authenticated')
  })
})
