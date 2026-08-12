# Task 7 report — routed Me workflows and split settings

## Status

Implemented the routed Me workflow slice without award routes:

- Extracted Profile, Feature, and Settings sections from the removed monolith.
- Added durable Profile, Posts list/new/edit, Feature, Settings overview, Visibility, Notifications, and Privacy pages.
- Kept BIO quota exhaustion scoped to BIO fields/submission; preference pages use narrow builders and remain saveable.
- Adapted `PostsSection` for list/new/edit route state and preserved membership gates: pending can draft, approved can publish, suspended/rejected cannot write and see recovery copy.
- Preserved bright Me/settings entry cards through the accepted `DashboardCard` system.

## TDD evidence

- Expanded `tests/dashboard/profile-patches.test.ts` with exact checkbox on/off values and cross-group key exclusion. The existing Task 2 builders passed all seven cases.
- Added `tests/dashboard/posts-routing.test.ts`.
  - RED: route-state test failed with `resolvePostEditorState is not a function`.
  - GREEN: exported the resolver and used it to initialize/synchronize routed editors.
  - RED: membership capability test failed with `postMembershipCapabilities is not a function` after self-review found restricted list controls remained active.
  - GREEN: centralized capabilities and hid mutation controls for suspended/rejected accounts.

## Verification evidence

- `npm test -- tests/dashboard tests/member-posts tests/dev-dashboard/handler.test.ts`
  - PASS: 11 files, 88 tests.
- `git diff --check`
  - PASS: no whitespace errors.
- Runtime development compilation with an authenticated localhost demo session:
  - PASS, HTTP 200 and compiled successfully for all nine routes: Profile, Posts, Posts/New, Posts/[id]/Edit, Feature, Settings, Visibility, Notifications, Privacy.
- `npx tsc --noEmit`
  - Repository-wide check is blocked by pre-existing unrelated errors in legacy routes/components and missing optional Cloudinary/Remotion typings. Output contained no Task 7 file diagnostics.

## Self-review

- Confirmed every settings child route owns separate saving/saved/error state.
- Confirmed each settings form calls only its matching patch builder.
- Confirmed Profile calls `buildBioPatch` and refreshes the member after save.
- Confirmed Feature calls `createFeatureSubmission`, reloads previous submissions, and does not falsely mark refresh failures saved.
- Confirmed routed post edit selects only an owned post returned by `fetchMyPosts` and unknown IDs show a not-found recovery state.
- Confirmed no `/dashboard/me/award` route was introduced.

## Commit

Pending at report creation; final commit hash is reported in the task handoff.

## Concerns

- Full repository TypeScript cleanliness remains blocked by unrelated baseline errors; Task 7 route compilation and required suites are clean.
