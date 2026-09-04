# Controlled Launch Convergence Design

**Date:** 2026-09-04  
**Status:** Approved for implementation  
**Launch target:** A small, observable cohort before a wider public rollout

## Objective

Make the existing Top100 Africa Future Leaders member experience ready for a controlled launch. A newly invited awardee must be able to create an account, reach a useful dashboard, update and publish their BIO, read updates, discover opportunities, submit an Impact Project feature request, and complete the award journey through a safe payment and fulfilment handoff.

## Scope

This pass concentrates on the journeys that determine whether tomorrow's launch succeeds:

1. Invite-based signup, email delivery, CAPTCHA, and sign-in.
2. Dashboard navigation, responsive behavior, loading, empty, error, and success states.
3. BIO editing and canonical `/bio` profile routing.
4. Updates, opportunities, and Impact Project submissions.
5. Award address, quote, review, Paystack handoff, webhook confirmation, and courier tracking.
6. Preview deployment, production configuration validation, observability, security, and release gates.

Broad redesigns, speculative social features, and unrelated admin cleanup are excluded. Existing visual language—warm neutrals, orange accents, rounded cards, and compact editorial typography—remains the design foundation.

## Recommended Architecture

### Application boundaries

- Public pages remain available without a session.
- Member routes and member APIs derive identity from the verified Supabase session.
- Admin routes require a server-verified administrator role.
- Cookie-authenticated mutations require a same-origin browser request.
- `/bio` is a convenience alias; `/awardees/[slug]` remains the canonical public record.
- Payment, CAPTCHA, email, and courier features fail closed when production configuration is incomplete.

### Launch configuration

`npm run check:production` is the source of truth for required environment variables. Award checkout stays behind `AWARD_CHECKOUT_ENABLED`; GIG integration stays behind `GIG_ENABLED`. The preview environment uses provider test credentials. Live payment and live production deployment are separate, explicitly confirmed actions.

### Test records

Test data is clearly labelled and uses non-personal addresses. It includes:

- one invite code bound to a controlled test email;
- one welcome notification;
- one published opportunity;
- one Impact Project submission created by the test member;
- one test-mode award order if payment and courier test services are available.

Test records are not silently deleted. Their identifiers are reported for deliberate cleanup after verification.

## UX Design

### Authentication

- Keep the focused split-screen desktop composition and a single-column mobile form.
- Prevent cookie and notification prompts from covering form controls.
- Keep local demo credentials visible only in local development.
- Make password recovery an active, keyboard-accessible link.
- Present specific, non-sensitive errors with a clear recovery action.

### Dashboard

- Preserve the existing Awardee Hub navigation and high-priority “next move” card.
- Never leave the application on an indefinite loading screen: show a bounded retry state.
- Display current, actionable dates; expired opportunities do not appear as upcoming.
- When production collections are empty, explain why and provide an appropriate next action instead of a blank panel.

### BIO and public profile

- Show remaining update allowance and save state before submission.
- After a successful update, keep the edited values visible and expose a direct public-profile link.
- If a profile lacks a slug, route the member back to the editor with an actionable message.

### Opportunities and Impact Project

- Opportunity cards expose deadline, access level, save state, and a safe external application handoff.
- Empty production listings show a useful message and a link to updates.
- Impact Project submissions confirm receipt and immediately appear with a review status.

### Award

- Keep the four-step address → review → payment → tracking model.
- A usable quote always advances to review, even when the courier includes an informational message.
- Disabled or misconfigured checkout shows a clear unavailable state and never calls Paystack.
- No live payment or shipping transaction is executed during automated verification.

## Data Flow

1. An administrator generates an email-bound invite at `/admin/invites`.
2. Signup validates Turnstile and the invite server-side, creates the Supabase user and profile, links the corresponding awardee, and consumes the code atomically.
3. Middleware refreshes the member session and rewrites local demo requests only on loopback development hosts.
4. Dashboard APIs load and mutate the signed-in member's records only.
5. BIO changes update the member profile and linked public awardee record.
6. Opportunity and update APIs return published/visible records for the current membership.
7. Impact Project submissions enter editorial review as `pending`.
8. Award checkout uses a stored quote, Paystack reference idempotency, signed webhook confirmation, and courier status updates.

## Error Handling and Recovery

- Missing production configuration returns a controlled 503 or disables the action before external side effects.
- Authentication failures return 401; authorization failures return 403; missing records return 404.
- Provider failures use generic member-facing messages and structured server logs without secrets.
- Duplicate submissions, payments, and invite redemption are protected by existing uniqueness/idempotency boundaries.
- Loading states have retry affordances; form submissions retain entered data on recoverable errors.

## Verification Strategy

1. Add behavior tests before each code change and observe the expected failure.
2. Run focused tests after every slice.
3. Run the complete Vitest suite, application TypeScript check, ESLint, and optimized build.
4. Run production-mode HTTP checks for public, protected, retired, and same-origin boundaries.
5. Run desktop and mobile browser journeys with a fresh test member.
6. Verify console errors, broken images, focus order, form labels, responsive overflow, and loading/empty/error states.
7. Verify preview environment configuration without printing secrets.
8. Perform Paystack and courier checks in test mode only; live enablement requires explicit confirmation.

## Release Decision

The release is ready for a controlled cohort only when:

- production configuration validation passes;
- at least one usable invite, welcome update, and published opportunity exist;
- a fresh test member completes the critical journey;
- all automated gates and production build pass;
- preview browser checks have no launch-path console or accessibility failures;
- payment and courier are either proven in test mode or clearly disabled with a launch communication plan;
- rollback and monitoring ownership are documented.

