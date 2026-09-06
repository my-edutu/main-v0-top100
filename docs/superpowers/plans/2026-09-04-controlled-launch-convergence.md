# Controlled Launch Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** Make the invite-to-award member journey honest, observable, and suitable for a controlled production launch.

**Architecture:** Keep the current Next.js and Supabase boundaries, replace client-side launch placeholders with live API data, fail closed around unavailable integrations, and prove the journey through focused tests plus desktop and mobile browser checks.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Supabase, Tailwind CSS, Vitest, Playwright/Computer Use, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-04-controlled-launch-convergence-design.md`

## Global constraints

- Work in the existing branch because the launch-hardening changes are already present in its dirty worktree. Never stage unrelated files.
- Use strict TDD for behavior changes: add one focused failing test, observe the intended failure, implement the minimum fix, then rerun the test.
- Keep the existing warm-neutral and orange visual system. This is a preserve-style refinement, not a redesign.
- Use only real published production records in member-facing collections. Test fixtures must be clearly labelled.
- Do not authorize a persistent connector, create credentials, enable live payments/courier, or deploy to production without action-time confirmation.
- Do not transmit or seed a specific test email until the user supplies or explicitly approves that address.

## Task 1: Make authentication recovery and push messaging truthful

**Files:**

- Create: `lib/push-notification-readiness.ts`
- Create: `tests/security/push-notification-readiness.test.ts`
- Modify: `components/PushNotificationPrompt.tsx`
- Modify: `app/login/page-content.tsx`

1. Add a focused test proving the notification prompt is unavailable without browser support, a VAPID public key, or default permission, and available only when every prerequisite is present.
2. Run `npx vitest run tests/security/push-notification-readiness.test.ts` and confirm the module-missing failure.
3. Implement the pure readiness decision and URL-safe VAPID-key conversion.
4. Update the prompt to use the configured `applicationServerKey`, remove the fabricated fallback endpoint, show a clear inline failure, and avoid prompting when push is not configured.
5. Replace the disabled login recovery text with a keyboard-accessible link to `/auth/forgot-password`.
6. Run the focused test, `npm run typecheck`, and the login browser check.

## Task 2: Show live upcoming opportunities on the dashboard

**Files:**

- Create: `lib/dashboard/home-opportunities.ts`
- Create: `tests/dashboard/home-opportunities.test.ts`
- Modify: `lib/member-hub.ts`
- Modify: `app/dashboard/_components/dashboard-home.tsx`

1. Add tests proving that published, dated, non-expired opportunities are sorted by deadline and capped at three; rolling, closed, draft, and expired records are excluded.
2. Run `npx vitest run tests/dashboard/home-opportunities.test.ts` and confirm the module-missing failure.
3. Implement the pure selection/mapping helper using the existing opportunity date utilities.
4. Remove hard-coded fallback opportunities from member hub state.
5. Load `/api/member/opportunities` alongside dashboard previews and map the real rows into the Coming up section.
6. Keep the existing invitation rows and useful empty state.
7. Run the focused test, dashboard tests, typecheck, and an authenticated dashboard browser check.

## Task 3: Bound dashboard data loading and provide recovery

**Files:**

- Create: `lib/http/fetch-with-timeout.ts`
- Create: `tests/http/fetch-with-timeout.test.ts`
- Modify: `lib/member-hub.ts`
- Modify: `lib/opportunities/client.ts`

1. Add tests proving that successful requests pass through and stalled requests abort with a stable retryable message.
2. Observe the expected failing test.
3. Implement an abort-aware fetch helper with a conservative browser timeout and cleanup.
4. Use it for dashboard-critical member and opportunity reads without changing server contracts.
5. Run focused tests, typecheck, and verify the dashboard retry state in the browser.

## Task 4: Expand production configuration gates for the launch scope

**Files:**

- Modify: `lib/production-readiness.ts`
- Modify: `tests/security/production-readiness.test.ts`
- Modify: `scripts/check-production-readiness.ts`
- Modify: `package.json`

1. Add tests proving the normal controlled launch can keep awards disabled, while `requireAwards` requires enabled checkout, Paystack, enabled GIG, and the complete GIG configuration.
2. Observe the focused test fail.
3. Add readiness options and a `--require-awards` CLI flag without logging secret values.
4. Add `npm run check:launch` for the approved full member-plus-award launch scope.
5. Run both readiness commands and report missing keys only.

## Task 5: Add safe, explicit launch-smoke fixture tooling

**Files:**

- Create: `lib/launch-smoke/fixtures.ts`
- Create: `tests/launch/fixtures.test.ts`
- Create: `scripts/prepare-launch-smoke.ts`
- Modify: `.gitignore`
- Modify: `package.json`

1. Add pure tests for deterministic, clearly-labelled opportunity/invite/notification fixture payloads and invalid email rejection.
2. Observe the module-missing failure.
3. Implement a dry-run-by-default CLI with `prepare` and `finalize` phases. Require `--apply`, `LAUNCH_SMOKE_EMAIL`, and production-safe Supabase configuration before writes.
4. Store generated invite output in a gitignored local file instead of printing credentials.
5. Do not apply fixtures until the user supplies or approves the exact test email.
6. Run unit tests and a dry run only.

## Task 6: Browser UX and critical-journey verification

**Files:** Modify only files tied to a reproduced launch-path defect.

1. Start the development server and use a clean test session.
2. Check login at desktop and mobile widths, including password recovery, cookie-consent overlap, keyboard focus, and absence of an unconfigured push prompt.
3. Check dashboard loading, empty, error, current update, live opportunity, BIO edit/public profile, Impact Project submission, and award steps.
4. Use Computer Use for the final visual inspection because it was explicitly requested.
5. Record console errors and fix only reproducible launch-path issues using the same TDD cycle.

## Task 7: Full release gates and preview

1. Run `npm test`.
2. Run `npm run typecheck`.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Run the production-mode HTTP smoke suite for public, protected, retired, asset, and CSRF boundaries.
6. Run `npm run check:production` and `npm run check:launch`, reporting only missing variable names.
7. Deploy a Vercel preview only after local gates pass. Do not promote it to production.
8. Repeat the critical browser journey against preview without executing a live charge or shipment.
9. Produce a launch decision with green, amber, and red items, rollback notes, and the exact remaining operator actions.

