# Talent discovery review status

Date: 8 November 2026. Review only; no main merge, production migration, deployment or member campaign was performed.

## Implemented in this branch

- Existing dashboard extension: five-step talent editor, drafts, publication review, visibility controls, application tracking and member-approved introductions.
- Existing awardee directory retains the archive and adds a structured talent view. Existing individual recognition content remains, with a separate reviewed portfolio section.
- Homepage contains two additive orange/amber sections; the pinned original source is preserved byte-for-byte after removing those additions.
- Organisation landing page and private, rate-limited opportunity briefs; public/member opportunity listing routes reuse the existing opportunity store.
- Grouped admin workspace for profile review, scoped evidence checks, organisation qualification, introductions, outcomes and the member email campaign preview/release gate.
- Additive private schema with service-only transitions, current-consent publication, stale-write checks, purpose-specific consent receipts, contact-access audit and member-reported versus confirmed outcomes.
- Member email template, opt-out handling, bounded recipient reservations, deduplication and post-launch superadmin send controls. No email has been sent.

## Verification actually available

- 40 executable domain assertions passed locally against authored source.
- 19 executable route/helper assertions passed locally with explicit Next/Auth/database doubles. These are not hosted integration tests.
- Structural checks passed, including the exact pinned-homepage preservation assertion.
- New TypeScript/TSX source was syntax checked. Pure domain modules passed strict TypeScript checking.
- An additional internal type pass used external-package stubs; this is not presented as a real Next.js build/typecheck.

## Required before merge or launch

- Actual locked-dependency installation and complete repository test/type/build/lint results on the final branch SHA.
- Execute the PostgreSQL synthetic harness and test the combined SQL against the real isolated Supabase schema.
- Authenticated browser and responsive review with actual components, existing CSS and navigation.
- Existing login, awards, checkout/delivery, festival and admin regression checks.
- Operational approval of selection/claim language, consent handling, staff responsibilities and the email sender.
- Reconcile branch/main drift and relevant draft security work without blindly merging old PRs.

The workspace connector was offline and external package installation was unavailable in the implementation container. A dedicated GitHub Actions workflow was added, but observed runs were pending/queued rather than successful. No production-readiness or all-tests-passing claim is made.

## Scope left for later phases

Self-service organisation accounts, AI matching, curated promotional collections, public impact reports, downloadable Talent Passport and deeper Edutu identity/API integration are not complete in this managed-pilot branch. Raw private certificate upload and broad recruiter document access were intentionally not introduced.

Review instructions: `docs/talent-network/LOCAL_REVIEW.md`.
