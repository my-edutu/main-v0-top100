# Festival Interest Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. The user has delegated design decisions and requested implementation.

**Goal:** Replace the dashboard promo stack with the supplied festival photograph and save members’ attendance and award pickup interest.

**Architecture:** A dedicated member page saves one interest record per member and festival. The server derives award payment status from the existing award payment service, with the existing award checkout as the payment destination. Staff can review a paginated list. Interest is not an event ticket or a fulfillment instruction.

**Tech Stack:** Next.js App Router, React, Supabase PostgreSQL, Vitest, existing Bachs award payment flow.

**Spec:** User’s dashboard browser comment and attached 2026 auditorium image in this chat.

## Constraints

- Preserve unrelated working tree changes and existing payment/provider contracts.
- Use the exact attached image; do not invent festival dates, venue, pricing, or attendance counts.
- A payment checkbox or payment return URL cannot prove payment. Failed verification must never become an invitation to pay again.
- Persist pickup intent before routing to payment. Reopening the festival page derives current payment state, including refunds.
- No production database writes, real checkouts, or deployment during verification.

## Tasks

- [x] Test and implement strict input validation, current payment resolution, idempotent persistence, authenticated member endpoints, and additive RLS migration.
- [x] Replace the home promo stack with one image card; implement the accessible interest form, save/retry states, and durable link back from award payment.
- [x] Add staff review with pagination, access control, and no cached personal data.
- [x] Run focused tests, type/lint checks, local migration checks, and phone/desktop browser checks. Obtain one final independent review and address findings.

## Execution ledger

### UI refinement requested after review

- User reports clutter and departure from Top100 UI standards. Follow the Top100 UI guide: reuse the route heading and form primitives, remove the duplicate hero/slogan and repeated boxes, reduce the home image card to dashboard scale, and keep payment help inline.
- Show saved interest as a concise summary with an explicit Edit action. Preserve payment verification, unpaid redirects, error recovery, and saved contact details. Keep payment return navigation as a quiet link.
- Verify the summary/payment action contract with focused tests, then inspect initial, saved, edit, unpaid, pending, and unavailable states at phone and desktop widths.
- Completed: card reduced to dashboard scale, duplicate hero and slogan removed, shared form primitives applied, saved summary/edit/cancel added, and payment return condensed to a quiet link. Mobile keeps the event caption alongside the existing app-bar title.
- Verified 69 feature/navigation/payment regression tests, edit/cancel restoration, save-to-summary persistence, unpaid routing after saving, pending review, unavailable verification recovery, and widths 373/430/768/1440. Browser payment-state fixtures were isolated from production.
- Independent review findings addressed: dark payment link now measures 12.81:1 contrast; completion link has proper insets; empty and invalid fields show associated inline errors and focus the first invalid field after rendering. Shared focus rings no longer double up. General request errors remain form-level alerts.
- Final refinement verification: 69 focused tests passed, targeted ESLint has no warnings/errors, and production build passed with all 260 pages generated. Card and form previews are in `output/playwright/festival-refined-*`. No deployment performed.
- Desktop promo row explicitly spans the dashboard grid, matching the previous promo placement. Browser measurement confirms 1136 × 280px at 1440px viewport; it no longer stretches alongside the onboarding panel.

- Exact attached image recovered from this chat’s input image and compressed to WebP without changing its content.
- Ruling: Use permanent saved interest for festival 2026, with editable details and pickup intent. Payment readiness is derived at read/save time; no courier order or payment is modified by this form.
- Verified 67 focused feature/payment/home/receipt regression tests, TypeScript, ESLint with no new warnings (the existing complete-page effect has a warning), and the local SQL migration smoke test. SQL changes were rolled back.
- Browser found the protected `/dashboard` asset prefix blocked image optimization; moved the attachment to `/images/afl-festival-2026.webp`, and verified the optimizer returns 200.
- Independent review found no blocking production issues. Fixed its local-demo finding: payment reconciliation now reads the isolated sample payment without interpreting a completion query as payment proof.
- Browser verified attendance saved and retained after reload, unpaid pickup redirected to existing checkout, local sample checkout completed, saved details/pickup intent remained, confirmed payment displayed, payment recheck retained unsaved edits, and load-error retry recovered. Added the shared festival return link to both payment and its completion receipt after tracing the actual redirect.
- Inspected phone (430px), tablet (800px), and desktop (1440px) layouts. Staff list was checked in an isolated component preview with sample responses, including mobile long names and pagination. Admin API authorization remains tested separately.
- Final production build generated all 260 routes successfully. No production migration, checkout, or deployment was performed. Activation instructions are in `docs/operations/festival-interest.md`.
