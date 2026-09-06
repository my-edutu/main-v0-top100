# Launch Readiness Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the awardee onboarding, dashboard, BIO, opportunity, Impact Series, and award journeys safe enough for a controlled production launch.

**Architecture:** Preserve the existing Next.js App Router and Supabase design. Close public privilege-escalation routes, derive identity only from verified Supabase sessions, add reusable same-origin protection for cookie-authenticated mutations, and keep public BIO routing as a thin alias over the canonical awardee profile. Fix the award UI at its state-flow and static-asset boundaries, then make production configuration and release checks explicit.

**Tech Stack:** Next.js 15, React 18, TypeScript, Supabase Auth/PostgREST, Vitest, Paystack, Turnstile, Brevo.

**Spec:** Production-readiness audit and launch plan approved in this task on 2026-08-11.

## Global Constraints

- Preserve unrelated user changes in the existing dirty feature branch.
- Do not mutate production member/content/payment data while verifying.
- Privileged authorization must come from a verified session and server-owned role data.
- Cookie-authenticated mutations must reject cross-origin requests.
- Payment and courier behavior must fail closed when production configuration is absent.
- Tests must exercise behavior; no source-text assertions for new production logic.

---

### Task 1: Disable public administrator bootstrap surfaces

**Files:**
- Modify: `app/api/profiles/fix-admin/route.ts`
- Modify: `app/api/profiles/set-admin/route.ts`
- Modify: `app/auth/admin-setup/page.tsx`
- Modify: `app/auth/fix-admin/page.tsx`
- Test: `tests/security/admin-bootstrap.test.ts`

**Interfaces:**
- Produces: HTTP 404 for every legacy bootstrap API/page in every environment.

- [ ] Write route tests that call both POST handlers without credentials and expect 404 with no privileged side effect.
- [ ] Run `npm test -- tests/security/admin-bootstrap.test.ts` and confirm it fails against the current public handlers.
- [ ] Replace the handlers with constant 404 responses and replace both pages with `notFound()`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Make profile lookup session-bound and minimal

**Files:**
- Modify: `app/api/auth/check-profile/route.ts`
- Modify: `app/login/page-content.tsx`
- Modify: `app/admin/login/page-content.tsx`
- Test: `tests/security/check-profile.test.ts`

**Interfaces:**
- Consumes: `getServerSession(request)` and the server-side Supabase client.
- Produces: `{ profile: { role: Role } }` for the authenticated user's own profile; 401 otherwise.

- [ ] Write tests for unauthenticated rejection, body-ID ignoring, minimal output, and invalid roles.
- [ ] Run the focused tests and confirm the unauthenticated/body-ID tests fail.
- [ ] Derive the profile ID solely from the verified session and select only `role`.
- [ ] Remove client-supplied user IDs and production auth debug logging from both login flows.
- [ ] Re-run the focused tests.

### Task 3: Add reusable same-origin protection

**Files:**
- Create: `lib/security/same-origin.ts`
- Modify: authenticated state-changing Route Handlers under `app/api/member/**`
- Modify: `app/api/auth/check-profile/route.ts`
- Test: `tests/security/same-origin.test.ts`

**Interfaces:**
- Produces: `rejectCrossOriginMutation(request): NextResponse | null`.

- [ ] Write table-driven tests for matching Origin/Host, forwarded production hosts, absent browser Origin, and hostile origins.
- [ ] Run the tests and confirm the helper is missing.
- [ ] Implement strict URL/host comparison without trusting arbitrary forwarded hosts outside the configured site origin.
- [ ] Apply the guard before authenticated mutations.
- [ ] Run focused security and member workflow tests.

### Task 4: Fix award state propagation and static illustrations

**Files:**
- Modify: `app/dashboard/awards-section.tsx`
- Move: `public/dashboard/award/*.webp` to `public/award/*.webp`
- Modify: `tests/security/middleware-dashboard-auth.test.ts`

**Interfaces:**
- Produces: award assets that bypass dashboard authentication and claim badge updates that occur from an effect, never inside a state updater.

- [ ] Add a middleware test proving `/award/address.webp` is public while `/dashboard/**` remains protected.
- [ ] Run the focused test and reproduce the existing protected-asset behavior where applicable.
- [ ] Move asset references to `/award/*.webp`.
- [ ] Move `onClaimStateChange` invocation into an effect driven by `state?.needsClaim`.
- [ ] Verify with focused tests and a production browser console smoke test.

### Task 5: Add canonical BIO aliases

**Files:**
- Create: `app/bio/page.tsx`
- Create: `app/bio/[slug]/page.tsx`
- Modify: `app/dashboard/_sections/profile-section.tsx`
- Test: `tests/dashboard/bio-routing.test.ts`

**Interfaces:**
- Produces: `/bio` redirect for the signed-in member and `/bio/[slug]` permanent redirect to `/awardees/[slug]`.

- [ ] Write routing helper tests for valid slugs and missing member linkage.
- [ ] Run the focused tests and confirm failure.
- [ ] Implement authenticated current-member lookup and public alias redirects.
- [ ] Update the dashboard public-profile link to use `/bio/[slug]`.
- [ ] Re-run focused tests and smoke-test both routes.

### Task 6: Fail closed on launch-critical production configuration

**Files:**
- Create: `lib/production-readiness.ts`
- Create: `scripts/check-production-readiness.mjs`
- Modify: `package.json`
- Modify: `app/api/auth/signup/route.ts`
- Test: `tests/security/production-readiness.test.ts`

**Interfaces:**
- Produces: deterministic checks for Supabase, site URL, Turnstile, email, Paystack, and optional courier settings; `npm run check:production` exits non-zero when required launch settings are absent.

- [ ] Write tests for missing required variables, controlled award enablement, and production CAPTCHA fail-closed behavior.
- [ ] Run focused tests and confirm failure.
- [ ] Implement configuration validation without printing secret values.
- [ ] Wire the checker into `package.json` and enforce Turnstile configuration in production signup.
- [ ] Re-run focused tests.

### Task 7: Restore meaningful release gates and verify

**Files:**
- Modify: `next.config.mjs`
- Modify: lint/type configuration only when needed to exclude generated or separate-tooling files.

**Interfaces:**
- Produces: a release report from tests, application TypeScript, lint, build, production HTTP smoke tests, and browser journey checks.

- [ ] Run all tests.
- [ ] Run TypeScript and classify any remaining errors by launch-path versus unrelated tooling.
- [ ] Run lint and exclude generated artifacts rather than suppressing application errors.
- [ ] Remove build-time TypeScript/lint bypasses only after the corresponding checks pass.
- [ ] Run a clean production build and production server smoke test.
- [ ] Re-check database readiness counts without writing data and report operational blockers separately from code readiness.

## Implementation status — 2026-09-04

All seven tasks are implemented and verified. Two scoped adjustments were made during execution:

- Award illustrations remain at `/dashboard/award/*.webp`; middleware now has an exact immutable-file allowlist for the three illustrations. This preserves existing references without exposing any dashboard route.
- The production checker is TypeScript (`scripts/check-production-readiness.ts`) and loads Next.js environment files before validation.

The authenticated browser pass also found and fixed a quote-navigation edge case: a usable `quoted` response now advances to review even when the courier includes an informational message. The legacy email-only awardee editor now fails closed unless its database setting explicitly enables it.
