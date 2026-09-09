# Task 2 report — Member application API

Implemented the authenticated Project100 member API:

- `GET /api/member/project100` returns the server-owned schedule, only the signed-in member's application, and a deadline/status-derived `canEdit` value.
- `PUT /api/member/project100` strictly validates a partial draft, preserves omitted stored answers, rejects closed or submitted applications, and relies on the authenticated Supabase client plus RLS for member isolation.
- `POST /api/member/project100/submit` validates the stored complete draft, checks the schedule before calling the constrained `submit_project100_application` RPC, and returns only the safe member response shape.

The schedule is read with the admin client because it has no member RLS read policy. Application reads and writes use the authenticated server client. Responses omit `memberId` and all database-only identifiers except the application id.

Verification completed:

- `npm test -- tests/project100/member-api.test.ts tests/project100/schema-contract.test.ts` — 14 tests passed.
- `npm run typecheck` — passed.
- `git diff --check` — passed.

No live Supabase integration check was run; focused route tests mock session and persistence boundaries.

## Review fixes

- The authenticated database client now receives the token verified by `getServerSession`, including bearer tokens, through its Supabase Authorization header.
- A follow-up migration applies the schedule deadline inside member draft RLS INSERT and UPDATE policies. `clock_timestamp()` makes the policy evaluate against the actual write time.
- Route handlers catch `ZodError` directly and consistently return `400` for invalid drafts and incomplete stored submissions.
- Added persistence-boundary tests for member scoping, safe response mapping, omitted-field preservation, bearer propagation, RPC submission, and closed-schedule rejection.
