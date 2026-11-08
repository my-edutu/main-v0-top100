# Talent Discovery: critique and repair pass

Date: 8 November 2026  
Branch: `feat/talent-discovery-review-20261108` — Draft PR #7  
Original inspection: `79d2f33747f81b7e2746d059c6049366970c563f`  
Reconciled parent: `c68237c064f8e2b8418a736dea41fd531139af5c`

## Verdict

The original release covered many pages but was not a dependable member journey. Keep it in draft. This continuation improves the editor and repairs concrete save, privacy and navigation defects; it does not establish production readiness.

The branch advanced during the audit. The newer `c68237c` repair is preserved: validated member responses, private-state clearing after authentication loss, the shared mutation lock, unsaved-link navigation guard, publication requirements and all 15 client / 12 privacy regression cases remain. The earlier snapshot API now also requires a monotonic privacy revision. Existing SQL, tests and the previous review report remain in the branch. No force-push, main merge, production SQL, deployment or member email send was performed.

## Criticism and repair

| Weakness | Repair in this continuation |
|---|---|
| Unfinished projects, graduation years and links could not be saved. | Private drafts accept bounded unfinished text; submission still rejects incomplete entries and unsafe links. Draft previews do not open incomplete links. |
| Slow responses and multiple tabs could discard newer work. | Preserve typing after a request starts. Merge independent edits; require an explicit choice for overlapping fields. Save against the draft revision the editor actually reconciled. |
| The editor offered too little guidance and recovery. | Five steps, next/back controls, actionable required-details checklist, private preview, honest save status and explicit conflict recovery. Completeness is not a talent score. |
| Comma-separated skills were awkward while typing. | Keep the focused input string intact; normalize structured values separately. Autosave does not strip a trailing space from active typing. |
| Boolean privacy snapshots could repeat after intervening decisions. | Independent monotonic privacy revision in both supported API formats. Missing/stale versions fail closed. A restrictive withdrawal preserves the latest saved email opt-out. |
| Withdrawal/brief closure omitted already delivered introductions. | Added SQL triggers withdraw pending, accepted and introduced records with revision/audit entries. Later opt-in, republication or reopening cannot revive the old introduction. |
| Filters and directory mode were not shareable; old cohort links broke context. | URL-backed talent filters; legacy cohort/search links open the archive; deterministic internal return links restore the directory rather than following arbitrary browser history. |

The SQL repair and its regression harness are authored but were not executed against PostgreSQL during this session. API doubles do not prove database atomicity or row-level security.

## Behaviour and limits

Draft saving is attempted after a 1.5-second idle pause. Manual Save and Submit remain available. Failed requests pause automatic retries and retain the form. Privacy changes need their own explicit Save action; submission does not enable discovery.

Profile and privacy controls share one authenticated resource and write lock. Responses are validated; authentication loss clears loaded private data. Unsaved privacy choices stay mounted while moving between editor sections. The existing full-page/same-tab-link warning is retained; browser-history/app-router navigation still needs real browser acceptance testing.

Three-way merging operates per field; project/education arrays are treated as complete fields, not silently merged item by item. The private preview is not publication or verification. Already disclosed contacts, downloads and external search caches cannot be recalled.

## Fresh verification

| Check | Result and scope |
|---|---|
| Domain/navigation regression script | 26 passed, 0 failed; includes one source-wiring assertion. |
| New API regression script | 12 passed, 0 failed; real route/helpers with explicit external dependencies doubled. |
| Preserved client regression script | 15 passed, 0 failed; actual hook/event handlers with explicit React scheduling/network doubles. |
| Preserved privacy regression script | 12 passed, 0 failed; actual snapshot-route authorization/parser checks with transport doubles. |
| Strict TypeScript | Passed for standalone domain modules, including visibility and editor state. |
| Authored TS/TSX syntax | Passed; not a framework build. |
| Additional limited UI typing | Passed with minimal ambient declarations; not the installed React/Next type definitions. |
| Full `npm test` attempt | Could not start: sparse local workspace lacks the full repository/package.json. |
| PostgreSQL/Supabase and authenticated browser | Not executed; no fresh full-app screenshots or end-to-end success claimed. |

Total: 65 focused passing checks, not 65 end-to-end tests. The earlier implementation failed seven of the new API cases before repair. The client harness retains all existing assertions; it expands extracted stateless fields, mounts the comma-input component independently and cleans up timers after each case.

The coding-workspace connector was offline; external package installation was unavailable. GitHub checks observed during the audit were queued. Read final-SHA CI results independently before claiming a full suite/build pass.

## Mandatory setup change

Apply the reviewed SQL only to isolated local/staging Supabase, in this order:

1. `supabase/schema/talent-discovery.sql`
2. `supabase/schema/talent-discovery-constraints.sql`
3. `supabase/schema/talent-discovery-privacy-guard.sql`
4. `supabase/schema/talent-discovery-review-fixes.sql`

The fourth file is mandatory for this candidate. Stored rows without the new privacy revision report setup required rather than use unsafe defaults. The original snapshot endpoint is retained but strengthened; old tabs must reload before granting permission. Do not restore the unversioned setter as a rollback shortcut.

See `LOCAL_REVIEW.md` for setup, complete synthetic journeys, email gates and rollback. Before release: execute all SQL checks, real Supabase/Auth journeys, full repository tests/lint/typecheck/build and mobile/desktop/keyboard browser review. Regress existing award/payment/delivery/event flows. The homepage and logo were not edited in this continuation. Email remains gated off until a genuinely reviewed launch.
