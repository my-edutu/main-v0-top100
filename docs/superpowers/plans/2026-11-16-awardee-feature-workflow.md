# Awardee feature workflow

User authorized implementation of the reviewed gaps on November 16, 2026.

Keep manual publishing and the existing admin-only drafts and posting audit trail. Replace the two editors with a single four-channel composer. Search the directory on the server with pagination. Save each channel before sharing; explicitly record a live post after publication. Display selected-awardee history and paginated global drafts/history. Render a branded 1080 × 1350 card using public profile facts and the existing image, without fabricating achievements.

- [x] Add regression coverage for paginated directory search, X draft support, stale saves and branded artwork.
- [x] Extend the existing draft platform constraint to X with a migration; retain access rules and existing records.
- [x] Consolidate the UI, persistent channel drafts, explicit posting records and history navigation.
- [x] Verify social tests, typecheck, lint and browser layouts; document any production migration dependency.

Review focus: profiles beyond the first 200; failed saves retaining edits; switching awardees with unsaved work; already-posted channels; missing public images; long names; unverified external publication; stale profile snapshots.

Verified: 1,961 tests passed, 27 opt-in database tests skipped; production build and scoped ESLint passed. Desktop, phone and tablet fixture checks passed. Active Dokploy database migrations applied and Data API verified. Frontend was not deployed.
