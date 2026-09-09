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
