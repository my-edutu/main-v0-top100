# Awardee Onboarding Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add a persistent awardee onboarding journey with a founder welcome, profile/post completion, optional opportunities and award actions, and an independently paid magazine feature application.

**Architecture:** Keep the dashboard journey in its own client component backed by an authenticated server API; derive profile, published-post, and award states from their existing sources and persist only acknowledgements. Add an isolated magazine-feature order/attempt/application ledger and route Bachs events by immutable payment scope so magazine confirmation cannot update award state. Put editable onboarding content/social links in a narrowly scoped admin settings record, with canonical amount validation on the server.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres migrations and RLS, existing Bachs hosted checkout/webhook modules, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-awardee-onboarding-journey-design.md`

## Global Constraints

- Core progress counts only welcome acknowledgement, complete profile plus saved avatar, and a published introduction post.
- Magazine feature prices are server-owned: NGN `1000000` kobo and USD `1000` cents; an editorial application is unavailable until a matching signed-webhook-confirmed payment exists.
- Magazine payment state is separate from award payments, award status, and delivery state.
- Third-party social shares are guided/manual; never claim automatic tagging or verified publication.
- Founder LinkedIn is `https://www.linkedin.com/in/paul-light-/`; organization LinkedIn is `https://www.linkedin.com/company/top100africa/`; unverified Facebook/Instagram destinations remain hidden.
- Canva cutout artwork is a replaceable future asset; the first release uses a branded fallback.
- Do not apply migrations to the remote Supabase project or modify the unrelated `next-env.d.ts` change.

## Review Focus

- A forged payment return, mismatched amount/currency, duplicate webhook, or cross-scope reference must never unlock a magazine application or update an award. Test each at the webhook/service boundary.
- A direct authenticated API request from another member must not read or mutate journey state, magazine attempts, or applications. Test ownership and RLS contracts.
- Empty profile data, missing avatar, draft post, and route visits must not be reported as completed progress. Test derived progress with real pure-domain inputs.
- Unset or malformed social URLs and absent Canva art must render only safe actions and the branded fallback. Test settings validation and component states.
- Members who paid their award but not the magazine fee, and members who paid the magazine fee but not the award, must remain independently represented. Test cross-flow isolation.

---

### Task 1: Add onboarding and magazine feature persistence

**Files:**
- Create: timestamped migration from `supabase migration new afl_awardee_onboarding_journey` (use the exact generated filename)
- Create: `tests/awards/onboarding-magazine-migration.test.ts`
- Create/update: `supabase/tests/afl_awardee_onboarding_rls.test.sql` if local Supabase test tooling is available

**Interfaces:**
- Provides tables `awardee_onboarding_progress`, `magazine_feature_campaigns`, `magazine_feature_orders`, `magazine_feature_payment_attempts`, and `magazine_feature_applications`.
- Provides RPCs `reserve_bachs_magazine_checkout`, `fail_bachs_magazine_checkout_creation`, and `process_bachs_magazine_webhook_event` with atomic, idempotent state transitions.
- Uses `profiles.id` as member ownership and the existing service-role-only payment access pattern.

- [ ] Inspect current `profiles`, `member_posts`, `member_features`, `award_orders`, and payment ledger DDL before writing SQL; add constraints only to columns confirmed by those schemas.
- [ ] Write migration-contract tests first for fixed prices (NGN 1,000,000 minor units; USD 1,000), payment-scope separation, unique provider references/idempotency keys, campaign uniqueness, and RLS/grant restrictions.
- [ ] Run `npm test -- tests/awards/onboarding-magazine-migration.test.ts`; confirm failures are missing-schema-contract assertions.
- [ ] Create the migration using `supabase migration new afl_awardee_onboarding_journey`; implement only additive tables/functions/policies. Revoke browser roles from payment attempt/audit tables; allow members to read their own safe progress/application projections only. Do not grant members payment mutation access.
- [ ] Add SQL checks that reservation binds user/campaign/currency to canonical price under a per-member/campaign lock, webhook processing binds exact provider reference/attempt/scope and atomically confirms magazine state, and no magazine function writes `award_orders`.
- [ ] Re-run the migration test and, when Supabase CLI/database is available, run RLS SQL tests against local Supabase. Expected: all ownership allow/deny cases pass; no remote database is contacted.

### Task 2: Build onboarding domain, member API, and editable settings

**Files:**
- Create: `lib/dashboard/awardee-journey.ts`
- Create: `lib/dashboard/awardee-journey-server.ts`
- Create: `app/api/member/onboarding-journey/route.ts`
- Create: `app/api/admin/onboarding-journey/route.ts`
- Create: `app/admin/onboarding/page.tsx`
- Create: `app/admin/onboarding/onboarding-settings-form.tsx`
- Create: `tests/dashboard/awardee-journey.test.ts`
- Create: `tests/admin/onboarding-settings.test.ts`

**Interfaces:**
- `deriveAwardeeJourney(input): AwardeeJourneyState` derives welcome/profile/avatar/published-intro-post/award status without using route visits as completion.
- `getAwardeeJourney(memberId): Promise<AwardeeJourneyState>` reads authenticated member source data and own persisted acknowledgements.
- `updateAwardeeJourney(memberId, patch): Promise<AwardeeJourneyState>` accepts only supported acknowledgement/self-attestation fields.
- Admin settings API validates founder copy, safe HTTPS social URLs, flyer URL, campaign description, and prices; only admin server routes can mutate it.

- [ ] Add failing pure-domain tests for first visit (0/3), welcome acknowledgement, incomplete profile, no avatar, draft-only post, published post, award-paid state, and opportunities not affecting core progress.
- [ ] Run `npm test -- tests/dashboard/awardee-journey.test.ts`; expected: exported derivation function is missing.
- [ ] Implement typed derivation with three core steps; keep award/certificate status and optional action status separate.
- [ ] Add a rate-limited authenticated member endpoint that gets identity from `getCurrentUser`, reads source data via the admin client, and limits updates to that member's welcome acknowledgement and explicit external-share acknowledgement.
- [ ] Add failing admin settings validation tests for malformed URLs, unsafe protocols, excessive copy length, invalid currencies/prices, and missing optional social destinations.
- [ ] Implement admin-only read/update route and a simple `/admin/onboarding` editor using existing admin components; keep price values canonical and versioned server-side.
- [ ] Run both focused tests and `npm run typecheck`; expected: ownership is server-derived and all validation tests pass.

### Task 3: Add isolated Bachs magazine payment service and webhook scope

**Files:**
- Create: `lib/magazine/payment.ts`
- Create: `lib/magazine/payment-server.ts`
- Create: `app/api/member/magazine/payment/route.ts`
- Create: `app/api/member/magazine/payment/checkout/route.ts`
- Create: `app/api/webhooks/bachs-magazine/route.ts` (or safely dispatch the existing signed webhook by immutable attempt scope)
- Modify: `lib/payments/bachs/checkout.ts`, `lib/payments/bachs/types.ts`, `lib/awards/bachs-webhook.ts` only where generic safe provider behavior is required
- Create: `tests/magazine/payment.test.ts`
- Create: `tests/magazine/webhook.test.ts`

**Interfaces:**
- `magazineFeaturePrice(currency): { currency, amountMinor, bachsAmount, display, priceVersion }` is the sole application price source.
- `createMagazineFeatureCheckout(member, currency): Promise<{ checkoutUrl, attemptId }>` reserves before provider I/O and persists before returning a redirect.
- `getMagazineFeaturePaymentView(memberId): Promise<MagazineFeaturePaymentView>` returns a sanitized member-scoped projection.
- Webhook attempt scope is immutable and dispatches to either existing award processor or magazine processor; no event may cross scopes.

- [ ] Write failing money/checkout tests for NGN/USD minor units, unsupported currency, missing email, server-owned amount, success/cancel URLs, unique idempotency, provider-host allowlist, persistence race, and transient provider errors.
- [ ] Run `npm test -- tests/magazine/payment.test.ts`; expected: price and service exports are absent.
- [ ] Implement a purpose-aware Bachs checkout request using the shared low-level provider adapter while preserving award request metadata and callback paths exactly.
- [ ] Add checkout and payment-view routes with authenticated identity, rate limiting, safe projections, and truthful `confirming payment` states.
- [ ] Write failing webhook tests for invalid signature, wrong purpose/scope, unmatched reference, mismatched amount/currency, duplicate delivery, and valid success; assert magazine success never calls award notification or changes award status.
- [ ] Implement scope-aware verified event routing and magazine atomic RPC call; do not change award notification behavior for award attempts.
- [ ] Run focused magazine and existing `tests/awards/bachs-webhook.test.ts`, checkout suite, money suite, and `npm run typecheck`; expected: magazine tests pass and award regression tests stay green.

### Task 4: Gate editorial application on its own verified payment

**Files:**
- Modify: `app/api/member/features/route.ts`
- Modify: `app/dashboard/me/feature/layout.tsx`
- Modify: `app/dashboard/_sections/feature-section.tsx`
- Modify: `lib/member-hub.ts`, `lib/member-hub-server.ts`, and `app/api/member/me/route.ts` only to expose safe magazine application status/history
- Create: `app/dashboard/me/feature/payment-panel.tsx`
- Create: `tests/magazine/feature-application.test.ts`

**Interfaces:**
- The feature form is accessible only with a campaign entitlement confirmed by a magazine payment attempt.
- `POST /api/member/features` requires a verified paid campaign entitlement, then creates one linked application idempotently.
- Award payment status remains unchanged and is not used as a feature-application gate.

- [ ] Write failing route tests proving award-paid-only is rejected, magazine-paid is accepted, unpaid/forged return is rejected, and repeat submissions cannot create duplicate applications.
- [ ] Run `npm test -- tests/magazine/feature-application.test.ts`; expected: cases expose the current award-payment gate.
- [ ] Replace the award gate in both the API and layout with the magazine entitlement check.
- [ ] Add a compact currency selector/checkout/confirming/paid UI before the existing four-step editorial form; after confirmed payment, unlock and retain existing submission/history UX.
- [ ] Add tests for independent award/magazine paid states and application ownership; run focused feature tests, related member-hub tests, and typecheck.

### Task 5: Ship the dashboard journey and founder welcome

**Files:**
- Create: `app/dashboard/_components/awardee-onboarding-journey.tsx`
- Create: `app/dashboard/_components/founder-welcome-dialog.tsx`
- Modify: `app/dashboard/_components/dashboard-home.tsx`
- Modify: `app/globals.css` only if existing local styles cannot meet the responsive component needs
- Create: `tests/dashboard/awardee-onboarding-journey.test.tsx`

**Interfaces:**
- Journey component consumes `member` and `AwardeeJourneyState`; it fetches safe journey state, sends acknowledgement updates, and links to existing profile/posts/opportunities/feature/award routes.
- Welcome dialog presents editable long-form founder copy, script-font text signature with accessible equivalent, and safe LinkedIn CTA.
- Social sharing supports the verified LinkedIn destination, configured Facebook/Instagram destinations only, caption copy, downloadable branded fallback, and explicit manual-tagging instructions.

- [ ] Write failing UI tests for welcome CTA, progress 0/3→1/3, persisted avatar/post states, pending/error state, social links hidden when unset, manual external-share confirmation label, and mobile-friendly actions.
- [ ] Run the focused UI test; expected: journey component is missing.
- [ ] Implement the orange-gradient editorial journey panel in the old award prompt location; remove only the superseded onboarding prompt there and leave the separate award payment status available under recommended actions.
- [ ] Implement the full revisitable welcome letter with readable local handwriting font (bundle/locally load a licensed font; never depend on a remote font at runtime), close/back affordance, and safe LinkedIn follow CTA.
- [ ] Implement the intro-share guidance with member-editable caption, actual published post status from canonical data, generated fallback artwork/download using existing image utilities where feasible, and manually confirmed external sharing.
- [ ] Run the focused component test, related dashboard home tests, `npm run typecheck`, and targeted lint on touched TS/TSX files; expected: all pass and mobile controls remain above bottom navigation.

### Task 6: Verify end-to-end contracts and handoff

**Files:**
- Modify: relevant tests under `tests/magazine`, `tests/dashboard`, and `tests/awards` only for regressions found
- Create: `docs/superpowers/sdd/awardee-onboarding-journey-progress.md` only if the required execution ledger workspace is not ignored/available
- Do not modify: `next-env.d.ts`

- [ ] Run the entire `npm test` suite and read all failures; fix only feature-related regressions with a failing test first.
- [ ] Run `npm run typecheck` and `npm run lint` and record exact outcomes.
- [ ] If local Supabase is available, run `supabase test db`; otherwise verify migration contract tests and document that RLS SQL tests could not run locally.
- [ ] Run `npm run build` and a local route smoke test for dashboard, `/dashboard/me/feature`, member APIs, admin onboarding editor, and Bachs webhook routes with provider callbacks mocked or signed test fixtures.
- [ ] Inspect final diff for secrets, unsafe URLs, accidental award-payment writes, migration grants/RLS, and untouched pre-existing edits; record unresolved Canva/social/payment-provider dependencies.

### Task 7: Refactor the awardee updates inbox

**Files:**
- Modify: `app/dashboard/_sections/notifications-section.tsx`
- Preserve: notification filtering, read/unread state, per-item mutation, mark-all behavior, and badge synchronization.

- [ ] Replace the tall, card-within-card message treatment with a compact inbox summary, clearer unread emphasis, aligned metadata, and a responsive empty state.
- [ ] Verify the existing notification mutation/domain tests and run typecheck; inspect the inbox at mobile and desktop widths when browser access is available.
