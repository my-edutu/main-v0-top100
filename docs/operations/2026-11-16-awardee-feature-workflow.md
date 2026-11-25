# Awardee feature workflow — 16 November 2026

Admin → Social Sharing and the awardee-row sharing dialog use the same editor:

1. Search the public directory by name, with pagination across all matching awardees.
2. Review the public profile and branded 1080 × 1350 artwork. Generate captions or write verified facts manually.
3. Review and save each channel separately: LinkedIn, Facebook, Instagram and X.
4. Copy/share the saved caption and download artwork. Finish publishing in the destination app.
5. Paste the live post URL, explicitly confirm it is live, and mark it posted.

Saved drafts restore on reopening. Each awardee has paginated posting history; the main workspace also provides paginated Drafts and Posted lists. Opening a device share sheet never marks a post as published. No automatic social posting was added.

Unsaved edits prompt before closing/switching. Profile signatures reject saves against changed public facts. Draft revision checks prevent concurrent admins from silently replacing captions; use Reload saved channel to recover from a conflict while preserving other channel edits.

## Active production database

Applied on the self-hosted Supabase database on the active Top100 Dokploy server:

- `20260926003251_admin_awardee_social_sharing.sql`: missing tracking table and its access rules. Corrected an inline check constraint name that collided with the table-level publish-state constraint and prevented creation.
- `20261116091906_unified_awardee_features.sql`: adds X to the draft platform constraint.

First validated both in a transaction that rolled back, including an X draft in a temporary table. Then applied transactionally and reloaded the PostgREST schema. Confirmed RLS enabled, browser roles have no direct SELECT privilege, all four platforms allowed, and the service-role Data API read returns HTTP 200. Tracking table remained empty; no real awardees were marked posted. No external posts were sent.

The generated `SETUP-ALL.sql` predates other unrelated migrations. Regenerate it from migration sources with `node scripts/build-setup-sql.mjs` when refreshing the full bootstrap; this task did not include that unrelated generated expansion.

## Verification

Browser checks used isolated mocked API data with the real UI: generate, save all four channels, record a live post, inspect tracker, reload and restore drafts. Inspected desktop and phone screenshots; checked no horizontal overflow at 390 and 768 pixels. The temporary preview route was removed. This does not claim an authenticated production browser test or actual social platform delivery.

Final checks: 1,961 tests passed, 27 opt-in database tests skipped; production build (including TypeScript) and scoped ESLint passed. The build reports the repository’s existing middleware-to-proxy deprecation notice.

Frontend deployment is separate; the production database is prepared for these changes.
