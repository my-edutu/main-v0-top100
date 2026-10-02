import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

const root = process.cwd()
const migration = readFileSync(join(root, 'supabase/migrations/20261001100000_onboarding_burst_safety.sql'), 'utf8')
const profileMigration = readFileSync(join(root, 'supabase/migrations/20261001110000_member_profile_atomic_updates.sql'), 'utf8')
const worker = readFileSync(join(root, 'app/api/internal/email-outbox/process/route.ts'), 'utf8')
const visitsRoute = readFileSync(join(root, 'app/api/member/visits/route.ts'), 'utf8')
const claimRequest = readFileSync(join(root, 'app/api/auth/claim-request/route.ts'), 'utf8')
const claimSubmit = readFileSync(join(root, 'app/api/auth/signup/route.ts'), 'utf8')
const claimDirectory = readFileSync(join(root, 'app/api/auth/claim-directory/route.ts'), 'utf8')
const memberMe = readFileSync(join(root, 'app/api/member/me/route.ts'), 'utf8')

it('claims email jobs safely across workers and retries failed delivery with a bounded attempt count', () => {
  expect(migration).toContain('for update skip locked')
  expect(migration).toContain("when attempts >= 8 then 'dead'")
  expect(migration).toContain('least(3600')
  expect(worker).toContain('idempotencyKey: job.id')
  expect(worker).toContain("claim_member_email_outbox")
})

it('keeps provider calls off the dashboard visit response and merges preferences atomically', () => {
  expect(visitsRoute).toContain('after(async () =>')
  expect(visitsRoute).toContain("rpc('record_dashboard_visit'")
  expect(profileMigration).toContain('notification_prefs = coalesce(profile.notification_prefs')
  expect(profileMigration).toContain('profile.bio_update_count < profile.bio_update_limit')
  expect(memberMe).toContain(".limit(50)")
})

it('allows cohort members to share a network while retaining per-person signup throttles', () => {
  expect(claimRequest).toContain('claim-request-person:${awardeeId}:${email}')
  expect(claimRequest).toContain('maxRequests: 1200, windowSeconds: 60')
  expect(claimSubmit).toContain('claim-member:${session.user.id}')
  expect(claimSubmit).toContain('maxRequests: 1200, windowSeconds: 60')
  expect(claimDirectory).toContain('maxRequests: 3000, windowSeconds: 60')
})
