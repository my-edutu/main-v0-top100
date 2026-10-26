# Top100 AFL Team Platform — Handoff

Updated: 26 October 2026

## Current state

`team-platform/` is a local, independently deployable Next.js 16.3.4 app using React 19, TypeScript, Supabase Auth/Postgres, and a single additive SQL migration. The parent repository is on `main`; `git status` reports the entire `team-platform/` directory as untracked, so there is no Git baseline for its source yet. No commit was created.

The platform uses the same Supabase project as the main Top100 app. It references the existing `profiles`, `awardees`, `award_orders`, and `award_payment_attempts` records, while storing team operations, assignments, follow-ups, commissions, and withdrawal workflow in `team_*` tables. The user applied the migration; the shared database was subsequently confirmed to contain the team tables, sales team, and active membership.

The main app owns all administration, authorized from `profiles.role`. Team membership authorization is separate and requires an explicitly active membership. Team-host `/admin` requests redirect to the main app's `/admin/team-operations`; team-host `/api/admin/*` requests return 404. Signing into the team app always opens `/dashboard`. A Top100 admin profile no longer creates or activates a team membership automatically. Both apps need the same Supabase project and Auth provider settings. Separate production subdomains do not share browser sessions unless the auth cookie is configured for the parent domain; members may need to sign in on the team host.

## Verified completed features

- Main Top100 admin console exists under `app/admin/`; its API authorization checks the current `profiles.role` against `admin` and `superadmin`.
- Team platform provides team-facing awardee, follow-up, and earnings workflows. Former administration modules remain in the local source tree for migration/reference, but are no longer reachable from the team host.
- Applied migration links team awardees to existing public awardee/profile/order records and includes team tables, RPCs, RLS policies, indexes, and an initial `sales` team.
- TypeScript passes for `team-platform` after correcting three pre-existing type failures in the awardee type, password page callback, and Nodemailer type import.
- Main admin navigation points to its internal `/admin/team-operations` page. That page lists teams and memberships, approves/suspends members, assigns agent/team-leader roles, and sends invitations.
- Parent `tsconfig.json` excludes `team-platform/` so the main application compiles its own source tree independently.

## Pending work, prioritized

### P0 — Validate permissions and financial integrity

- Exercise access with a platform admin, an agent, an invited member, and a suspended member. Confirm the team host redirects `/admin` to the primary admin panel and denies `/api/admin/*`.
- Review RPC function grants and `SECURITY DEFINER` search paths, then validate RLS and all financial mutation paths against a live non-production Supabase project. File: `supabase/migrations/20261026090000_team_platform.sql`.
- Verify commission idempotency, reversal behavior, withdrawal locking, and payout transitions against real payment fixtures before production use.

### P1 — Connect operational records and administration

- Confirm the awardee projection sync covers inserts, updates, deletions, duplicate profiles, and records with no email. Check the migration triggers/functions and reconcile against live data.
- Extend the central Team Operations page with team creation/editing, commission rules, assignments, imports, payment review, withdrawals, reports, templates, settings, and audit review; keep every admin route on the primary Top100 host.
- Confirm existing Top100 admin accounts can authenticate via the shared Supabase Auth project and that invitations use the correct production callback URL and mail configuration.
- Add automated tests; the configured Vitest command currently finds no test files.

### P2 — Deployment and operations

- Document required environment variables without copying secrets, including the shared Supabase project, `NEXT_PUBLIC_TOP100_ADMIN_URL`, `NEXT_PUBLIC_TEAM_PLATFORM_URL`, cron secret, and SMTP settings.
- Configure and verify `teams.top100afl.com`, production build, cron scheduling, SMTP delivery, and security headers.
- Resolve the multiple-lockfile workspace-root warning in the team app build configuration.

### P3 — Future enhancements

- Add a true Top100-wide team directory and safe team switching if multiple operational teams are required.
- Add durable email delivery/retry monitoring and richer audit-log review tools.

## Known issues / risks

- `npm test` exits with code 1 because no `tests/**/*.test.ts` files exist.
- Team platform typecheck and production build now pass. The build still warns that it inferred the parent repository as the workspace root because both directories contain lockfiles.
- Next.js warns that it inferred the parent repository as the workspace root because both the parent and `team-platform` contain lockfiles.
- Team platform login uses the shared Supabase Auth project but its session cookie is host-scoped unless explicitly configured otherwise; cross-subdomain single sign-on is not implemented.
- The migration's initial table setup was verified after the user applied it; financial RPC and RLS behavior has not been fully audited against production-like fixtures.
- Deployment status and production credentials were not inspected.

## Exact next step

Finish moving the remaining team administration modules into the primary admin app, then verify role access using a platform admin, a standard member, an invited member, and a suspended team member.

## Changes made during this continuation

- `team-platform/lib/data.ts`: add `payment_note` to the awardee directory row type used by the existing refunded-payment UI.
- `team-platform/app/set-password/page.tsx`: remove an implicit-any callback typing issue.
- `team-platform/lib/email.ts`: use Nodemailer's exported `Transporter` type.
- `team-platform/lib/auth.ts`: removed implicit membership creation/activation based on a global Top100 profile role.
- `team-platform/proxy.ts`: redirect team-host admin pages to the primary admin panel and block team-host admin APIs.
- `team-platform/app/page.tsx` and dashboard: keep signed-in users on the team dashboard.
- `app/admin/team-operations/`: add central team access management and invitation UI.
- `app/api/admin/team-operations/`: add Top100-admin-guarded team membership listing, invitation, approval, role assignment, and suspension APIs.
- `app/admin/components/nav-config.ts`: point Team Operations to the internal admin route.

## Commands and results

- `npm run typecheck` in `team-platform`: passed after the fixes above.
- `npm test` in `team-platform`: not run successfully; Vitest reports no test files.
- `npm run build` in `team-platform`: passed; Next reports the multiple-lockfile workspace-root warning.
- `npm run typecheck` in `team-platform`: passed after the admin routing changes.
- `npm run typecheck` in the parent app: passed after the central Team Operations changes.
- `npm run build` in the parent app: passed after excluding `team-platform/` from its TypeScript project. The existing middleware-to-proxy deprecation warning remains.
- HTTP check: team host `/admin` returns a 307 to `http://localhost:3004/admin/team-operations`; `/api/admin/*` returns 404.
- Browser check: the central admin page loads the shared sales team and its active Top100 administrator membership.
