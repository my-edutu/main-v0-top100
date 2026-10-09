# Public Magazine Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable public visitors to pay and submit a 2026 magazine feature application without an account, with verified payment gating.

**Architecture:** Add guest order identity and a hash-only access token to the existing magazine payment records. Use guest-specific service-role RPCs and public API routes while reusing the Bachs checkout session builder and webhook; render the application at a public route and include its records in the existing admin review queue.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Postgres migrations/RPCs, Bachs hosted checkout, existing rate limiter.

**Spec:** `docs/superpowers/specs/2026-10-09-public-magazine-feature-design.md`

## Global Constraints

- The flow must not require an AFL account.
- The order's active campaign, amount, currency, identity, and paid state are server controlled.
- Only the signed Bachs webhook can confirm payment.
- Store only a SHA-256 hash of the 256-bit guest access token; set the raw token only in a scoped HTTP-only `SameSite=Lax` cookie.
- Guest applications must be bound to a paid order and created atomically at most once per order.
- Existing awardee magazine payments and applications must continue to use their current profile-based flow.
- Keep the popup cover artwork at a 4:5 ratio; render its requested white title as HTML text.
- Do not use the legacy `feature_requests` endpoint for the verified 2026 magazine payment flow.
- Per workspace instructions, do not add or run tests unless the user explicitly asks for testing or verification.

## Review Focus

- Guest checkout returns before the webhook arrives; the form stays locked and payment status can be refreshed.
- A missing, invalid, expired, or wrong-order cookie cannot read or submit guest application data.
- Multiple checkout requests for the same normalized email/campaign cannot create conflicting pending orders or duplicate paid applications.
- A failed Bachs session creation leaves a recoverable order state and does not mark payment paid.
- Existing profile-based orders retain their constraints and remain visible to their member after the migration.

---

### Task 1: Guest order and application persistence

**Files:**
- Create: `supabase/migrations/20261009120000_public_magazine_feature_applications.sql`

**Interfaces:**
- Produces `reserve_bachs_public_magazine_checkout(text,text,text,uuid,text,text,bigint,text,text)` for a guest email/name/token hash and server-calculated payment values.
- Produces `submit_public_magazine_feature_application(text,text,text,text)` for a guest-token hash and story fields.
- Both functions are executable only by `service_role`.

- [ ] Add nullable guest identity/token-hash columns to orders; backfill existing profile orders from `profiles`; make only `profile_id` nullable.
- [ ] Make `magazine_feature_applications.profile_id` and `member_features.member_id` nullable for guests.
- [ ] Add a partial unique index for normalized guest email plus campaign and preserve the existing profile/campaign uniqueness.
- [ ] Implement a transaction-safe reservation RPC that validates the active open campaign and exact server-calculated price, reuses an order only when the guest-token hash matches, and reserves at most one active attempt.
- [ ] Implement an atomic submit RPC that requires a matching token hash and paid order, rejects duplicate applications, creates the `member_features` row with `member_id = null`, then links the application row to the same order.
- [ ] Revoke public/authenticated execution and grant both functions to `service_role` only.

### Task 2: Guest checkout and status APIs

**Files:**
- Create: `lib/magazine/guest-access.ts`
- Create: `lib/magazine/guest-payment-server.ts`
- Create: `app/api/public/magazine/payment/route.ts`
- Create: `app/api/public/magazine/payment/checkout/route.ts`
- Create: `app/api/public/magazine/application/route.ts`
- Modify: `lib/magazine/payment-server.ts` only for shared campaign access if needed.

**Interfaces:**
- `createGuestMagazineFeatureCheckout(customer, token)` returns `{ checkoutUrl, accessToken, applicationStatus }` internally; the API sends `accessToken` only as an HTTP-only cookie, never in JSON.
- `getGuestMagazineFeatureView(token)` returns campaign availability, safe order status, current attempt URL, and application status without exposing order or token identifiers.
- `submitGuestMagazineFeatureApplication(token, input)` returns the mapped created/existing submission or a safe eligibility error.

- [ ] Generate 32 random bytes per new guest order; store the SHA-256 digest only and set the raw value in an HTTP-only, `SameSite=Lax`, path-scoped, 30-day cookie.
- [ ] Validate checkout name/email/country with Zod, derive active campaign and currency on the server, apply unauthenticated rate limits, and call the guest reservation RPC.
- [ ] Create/resume the Bachs session using server order/attempt IDs, immutable campaign price, purpose `afl_magazine_feature_v1`, and success/cancel paths under `/magazine/feature`.
- [ ] Implement cookie-bound payment status GET; return no private order data when the cookie is absent or does not match.
- [ ] Implement cookie-bound application POST that accepts only title/category/summary and checks the existing checkout switch, rate limits, and input schema before invoking the service-role RPC.

### Task 3: Public feature application page

**Files:**
- Create: `app/magazine/feature/page.tsx`
- Create: `app/magazine/feature/public-feature-application.tsx`
- Modify: `app/components/MagazinePopup.tsx`

**Interfaces:**
- Public route is `/magazine/feature`; no auth middleware or dashboard provider is required.
- Client starts checkout with name/email/country; after redirect it reads cookie-backed status and renders checkout, pending, paid form, or submitted state.
- Story fields are submitted without client-controlled member identity or price.

- [ ] Build the public route with metadata and application UI; fetch payment state on load and expose a manual refresh while pending.
- [ ] Render checkout identity/country fields before payment, and title/category/summary only after the signed webhook-backed view reports paid.
- [ ] Render an idempotent submitted state after the application exists; display a clear recovery message when the guest cookie is missing.
- [ ] Point popup CTA at `/magazine/feature`, render the cover title in two white lines (“AFRICA FUTURE LEADERS” / “2026”), and replace the dark backdrop with blur-only styling.

### Task 4: Admin review integration and final review

**Files:**
- Modify: `lib/member-hub.ts`
- Modify: `lib/member-hub-server.ts`
- Modify: `app/admin/member-hub/page.tsx`
- Existing protected routes: `app/api/admin/member-features/route.ts` and `app/api/admin/member-features/[id]/route.ts`

**Interfaces:**
- `MemberFeatureSubmission.memberId` allows `null` for public submissions.
- Admin member-hub review list includes both sources, labels the source, and updates status through the existing admin-only endpoint.

- [ ] Update the submission type and mapper for nullable `member_id`.
- [ ] Add an awardee/public source label in the Admin Member Hub feature queue without changing status workflow.
- [ ] Manually review the complete diff for SQL access grants, cookie scope, webhook-owned payment state, and compatibility with existing member submissions.
- [ ] Do not run tests or builds unless the user asks for verification.
