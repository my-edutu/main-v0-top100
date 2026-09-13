import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
const migrationName = readdirSync(migrationsDir).find((name) => /_bachs_award_payments\.sql$/.test(name))

if (!migrationName) {
  throw new Error('The Bachs award payment migration is missing.')
}

const sql = readFileSync(join(migrationsDir, migrationName), 'utf8')

describe('Bachs award payment migration', () => {
  it('keeps payment state separate from legacy delivery status', () => {
    expect(sql).toContain('award_payment_status')
    expect(sql).toContain('award_payment_attempts')
    expect(sql).toContain('payment_webhook_events')
    expect(sql).not.toMatch(/drop\s+column\s+paystack_reference/i)
    expect(sql).not.toMatch(/drop\s+column\s+gig_/i)
    expect(sql).not.toMatch(/update\s+public\.award_orders[\s\S]+gig_/i)
  })

  it('enforces one successful award-fee attempt and unique provider evidence', () => {
    expect(sql).toMatch(/provider_reference/i)
    expect(sql).toMatch(/provider_checkout_id/i)
    expect(sql).toMatch(/create\s+unique\s+index[\s\S]+award_payment_attempts_one_success_uidx/i)
    expect(sql).toMatch(/where[\s\S]+charge_scope\s*=\s*'award_fee'[\s\S]+status\s*=\s*'succeeded'/i)
  })

  it('adds concurrency-safe reservation and atomic success/event functions', () => {
    expect(sql).toContain('reserve_bachs_award_checkout')
    expect(sql).toContain('fail_bachs_award_checkout_creation')
    expect(sql).toContain('claim_bachs_award_payment_success')
    expect(sql).toContain('process_bachs_webhook_event')
    expect(sql).toContain('duplicate_succeeded')
    expect(sql).toContain('legacy_pending')
    expect(sql).toContain('pg_advisory_xact_lock')
  })

  it('preserves terminal legacy evidence and refunded orders', () => {
    expect(sql).toContain("'failed', 'reversed'")
    expect(sql).toContain("'cancelled', 'abandoned'")
    expect(sql).toMatch(/award_payment_status\s+not\s+in\s*\('paid',\s*'refunded'\)/i)
    expect(sql).toMatch(/award_payment_status\s*=\s*'refunded'[\s\S]+return\s+jsonb_build_object\([\s\S]+status',\s*'refunded'/i)
  })

  it('preserves successful attempt history when a refunded success is replayed', () => {
    expect(sql).toMatch(/award_payment_status\s*=\s*'refunded'[\s\S]+v_attempt\.status\s+in\s*\('succeeded',\s*'duplicate_succeeded'\)[\s\S]+processing_status\s*=\s*'processed'[\s\S]+notification_needed',\s*false/i)
  })

  it('keeps the current price contract in the database guard', () => {
    expect(sql).toContain("when 'NGN' then 2500000")
    expect(sql).toContain("when 'USD' then 2000")
  })

  it('restricts payment table writes and RPC execution to service_role', () => {
    expect(sql).toMatch(/revoke\s+all\s+on\s+table\s+public\.award_payment_attempts[\s\S]+from\s+public,\s*anon,\s*authenticated/i)
    expect(sql).toMatch(/revoke\s+all\s+on\s+table\s+public\.payment_webhook_events[\s\S]+from\s+public,\s*anon,\s*authenticated/i)
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.claim_bachs_award_payment_success[\s\S]+to\s+service_role/i)
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.process_bachs_webhook_event[\s\S]+to\s+service_role/i)
  })
})
