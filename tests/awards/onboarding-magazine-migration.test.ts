import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDirectory = join(process.cwd(), 'supabase/migrations')
const migrationName = readdirSync(migrationsDirectory).find((name) =>
  name.endsWith('_afl_awardee_onboarding_journey.sql'),
)
const migration = migrationName
  ? readFileSync(join(migrationsDirectory, migrationName), 'utf8')
  : ''

describe('awardee onboarding and magazine payment migration', () => {
  it('stores journey progress, editable content, campaign, payment and application separately', () => {
    expect(migrationName).toBeTruthy()
    expect(migration).toMatch(/create table if not exists public\.awardee_onboarding_progress/i)
    expect(migration).toMatch(/create table if not exists public\.awardee_onboarding_settings/i)
    expect(migration).toMatch(/create table if not exists public\.magazine_feature_campaigns/i)
    expect(migration).toMatch(/create table if not exists public\.magazine_feature_orders/i)
    expect(migration).toMatch(/create table if not exists public\.magazine_feature_payment_attempts/i)
    expect(migration).toMatch(/create table if not exists public\.magazine_feature_applications/i)
  })

  it('pins campaign prices to the requested NGN and USD minor-unit amounts', () => {
    expect(migration).toMatch(/1000000,\s*1000,\s*'afl-magazine-2026-v1'/i)
    expect(migration).toMatch(/currency in\s*\('NGN',\s*'USD'\)/i)
  })

  it('keeps payment records server-only and enables row-level security', () => {
    for (const table of [
      'awardee_onboarding_progress',
      'awardee_onboarding_settings',
      'magazine_feature_campaigns',
      'magazine_feature_orders',
      'magazine_feature_payment_attempts',
      'magazine_feature_applications',
    ]) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
    }
    expect(migration).toMatch(/revoke all on table public\.magazine_feature_payment_attempts from public, anon, authenticated/i)
    expect(migration).toMatch(/revoke all on table public\.magazine_feature_orders from public, anon, authenticated/i)
  })

  it('provides an atomic magazine webhook processor that never updates award orders', () => {
    expect(migration).toMatch(/function public\.reserve_bachs_magazine_checkout/i)
    expect(migration).toMatch(/function public\.fail_bachs_magazine_checkout_creation/i)
    expect(migration).toMatch(/function public\.process_bachs_magazine_webhook_event/i)

    const processorStart = migration.search(/create or replace function public\.process_bachs_magazine_webhook_event/i)
    expect(processorStart).toBeGreaterThanOrEqual(0)
    const processor = migration.slice(processorStart)
    expect(processor).not.toMatch(/(?:update|insert into)\s+public\.award_orders/i)
    expect(processor).toMatch(/charge_scope\s*=\s*'magazine_feature'/i)
  })

  it('requires paid magazine entitlement before atomically submitting its linked editorial application', () => {
    expect(migration).toMatch(/create or replace function public\.submit_magazine_feature_application/i)
    expect(migration).toMatch(/status\s*=\s*'paid'/i)
    expect(migration).toMatch(/member_feature_id uuid unique references public\.member_features/i)
    expect(migration).toMatch(/create trigger magazine_feature_application_status_sync/i)
    expect(migration).toMatch(/grant execute on function public\.submit_magazine_feature_application[\s\S]*to service_role/i)
  })
})
