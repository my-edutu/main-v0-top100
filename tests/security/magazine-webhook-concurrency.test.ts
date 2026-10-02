import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261001140000_magazine_webhook_order_lock.sql'),
  'utf8',
)

it('serializes magazine webhooks with checkout reservations and preserves a newer open attempt', () => {
  expect(migration).toContain('pg_advisory_xact_lock(hashtextextended')
  expect(migration).toContain('from public.magazine_feature_orders where id = v_attempt.order_id for update')
  expect(migration).toContain("status in ('creating', 'open', 'processing', 'exception')")
  expect(migration).toContain("set status = 'paid'")
})
