# Top100 AFL Team Platform — Handoff

Updated: 26 October 2026

## Current state

`team-platform/` is an independently deployable Next.js 16.3.4 app using React 19, TypeScript, and the shared Supabase Auth/Postgres project. Its source and additive migrations are tracked in the parent repository. The user applied the current additive rep-access-code, country-focus, and configurable-capacity migration; production behavior still needs end-to-end testing.

The platform uses the same Supabase project as the main Top100 app. It references the existing `profiles`, `awardees`, `award_orders`, and `award_payment_attempts` records, while storing team operations, assignments, follow-ups, commissions, and withdrawal workflow in `team_*` tables. The user applied the migration; the shared database was subsequently confirmed to contain the team tables, sales team, and active membership.

The main app owns all administration, authorized from `profiles.role`. Team membership authorization is separate and requires an explicitly active membership. Team-host `/admin` requests redirect to the main app's `/admin/team-operations`; team-host `/api/admin/*` requests return 404. Signing into the team app always opens `/dashboard`. A Top100 admin profile no longer creates or activates a team membership automatically. Both apps need the same Supabase project and Auth provider settings. Separate production subdomains do not share browser sessions unless the auth cookie is configured for the parent domain; members may need to sign in on the team host.

## Verified completed features

- Main Top100 admin console exists under `app/admin/`; its API authorization checks the current `profiles.role` against `admin` and `superadmin`.
- Team platform provides team-facing awardee, follow-up, and earnings workflows. Former administration modules remain in the local source tree for migration/reference, but are no longer reachable from the team host.
- Applied migration links team awardees to existing public awardee/profile/order records and includes team tables, RPCs, RLS policies, indexes, and an initial `sales` team.
- TypeScript passes for `team-platform` after correcting three pre-existing type failures in the awardee type, password page callback, and Nodemailer type import.
- Main admin navigation points to its internal `/admin/team-operations` page. That page lists teams and memberships, approves/suspends members, assigns agent/team-leader roles, and sends invitations.
- Existing rep sign-in works after Supabase invitation and admin approval. Self-registration is now available only with a one-time code generated in the primary Admin Panel; codes are hashed at rest, expire after seven days, and create an invited agent membership that remains pending until an administrator approves it.
- The central Admin Panel worklist now persists a country focus (Nigeria by default) and a configurable active-awardee cap per rep. The assignment SQL applies the selected country and cap to year shuffles, automatic assignment, and manual reassignment.
- Top100 Admin Panel now manages shared team email and WhatsApp templates at Team Operations → Email templates. Sales reps can personalize each message in the awardee contact view; email is sent through the branded Top100 SMTP sender and recorded with delivery outcome.
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

- Set the team app's SMTP environment variables without copying secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, and optionally `SMTP_FROM_NAME`. `SMTP_FROM_EMAIL` must be an address authorized by the configured SMTP service. Set `NEXT_PUBLIC_TOP100_ADMIN_URL`, `NEXT_PUBLIC_TEAM_PLATFORM_URL`, and cron settings as well.
- Configure and verify `teams.top100afl.com`, production build, cron scheduling, SMTP delivery, and security headers.
- Verify self-registration, country selection, and the configurable per-rep cap on a new test rep account after deployment.
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
- `app/admin/team-operations/access-code-panel.tsx` and `app/api/admin/team-operations/codes/route.ts`: generate, list, and revoke one-time rep codes from the primary admin panel.
- `team-platform/app/signup/page.tsx`, `components/signup-form.tsx`, and `app/api/auth/signup/route.ts`: create a sales-agent account with an admin-generated code; the membership stays invited until admin approval.
- `team-platform/supabase/migrations/20261026180000_rep_access_and_assignment_controls.sql`: add hashed signup codes, a country-option RPC, configurable per-rep capacity, and assignment enforcement.
- `team-platform/lib/email-html.ts` and `team-platform/app/api/email/send/route.ts`: send a Top100-branded HTML email plus text fallback through SMTP, with the SMTP sender fixed by deployment configuration and the rep address used as reply-to.
- `app/admin/team-operations/templates/` and `app/api/admin/team-operations/templates/route.ts`: let primary Top100 admins create and edit shared per-team email and WhatsApp templates; reps can edit a selected copy before sending.

## Commands and results

- `npm run typecheck` in `team-platform`: passed after the fixes above.
- `npm test` in `team-platform`: not run successfully; Vitest reports no test files.
- `npm run build` in `team-platform`: passed; Next reports the multiple-lockfile workspace-root warning.
- `npm run typecheck` in `team-platform`: passed after the admin routing changes.
- `npm run typecheck` in the parent app: passed after the central Team Operations changes.
- `npm run build` in the parent app: passed after excluding `team-platform/` from its TypeScript project. The existing middleware-to-proxy deprecation warning remains.
- HTTP check: team host `/admin` returns a 307 to `http://localhost:3004/admin/team-operations`; `/api/admin/*` returns 404.
- Browser check: the central admin page loads the shared sales team and its active Top100 administrator membership.
