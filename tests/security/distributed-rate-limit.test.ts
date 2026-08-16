import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const limiter = readFileSync(join(root, 'lib/rate-limit.ts'), 'utf8')
const route = readFileSync(join(root, 'app/api/notifications/subscribe/route.ts'), 'utf8')
const migration = readFileSync(
  join(root, 'supabase/migrations/20260816_create_distributed_rate_limits.sql'),
  'utf8',
)

describe('distributed production rate limiting', () => {
  it('does not use process-local counters and hashes identifiers before persistence', () => {
    expect(limiter).not.toContain('new Map')
    expect(limiter).not.toContain('setInterval(')
    expect(limiter).toContain('globalThis.crypto.subtle.digest')
    expect(limiter).toContain("supabase.rpc('consume_api_rate_limit'")
  })

  it('uses an atomic invoker-rights database function with service-role-only access', () => {
    expect(migration).toContain('on conflict (key_hash) do update')
    expect(migration).toContain('alter table public.api_rate_limits enable row level security')
    expect(migration).toContain('security invoker')
    expect(migration).not.toContain('security definer')
    expect(migration).toContain('revoke all on table public.api_rate_limits from public, anon, authenticated')
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.api_rate_limits to service_role',
    )
    expect(migration).toContain(
      'revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated',
    )
    expect(migration).toContain(
      'grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role',
    )
  })

  it('protects all push-subscription operations and fails closed when the limiter is unavailable', () => {
    expect(route).toContain("enforceSubscriptionRateLimit(req, 'create', 5)")
    expect(route).toContain("enforceSubscriptionRateLimit(req, 'delete', 10)")
    expect(route).toContain("enforceSubscriptionRateLimit(req, 'status', 60)")
    expect(route).toContain('error instanceof RateLimitUnavailableError')
    expect(route).toContain('{ status: 503')
  })
})
