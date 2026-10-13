# Security and deployment triage — October 13, 2026

**Branch:** `audit/webapp-stabilization-2026-10-13`  
**Decision:** NO-GO for production until outstanding security findings and missing preview validations have been reviewed. Do not merge solely because the test/build/lint gates are green.

## Verified improvements

| Dependency | Before | After | Outcome |
| --- | --- | --- | --- |
| `sharp` | 0.35.4 | 0.35.5 | GHSA-wq5f-xc86-pv6w patched |
| `source-map-js` | 1.2.1 | 1.2.2 | GHSA-68fv-2mgg-jv7q patched |
| `vitest` | 3.2.7 | 5.0.4 | Major upgrade tested successfully; old vulnerable `tinypool` no longer appears in the lockfile |

The Vitest 5 upgrade passed all tests and a production build in its isolated GitHub Actions run; after merging the latest `main` payment-settlement commit into this branch, a subsequent Quality Gate run on commit `f0740516596438be39e0877dedb8057e51fd6f34` passed **1,454 tests in 246 files**, changed-line lint and TypeScript/production build.

## Remaining audit findings — blocking

The high/critical advisory regression script still flags **seven package names**:
`@next/eslint-plugin-next`, `braces`, `chokidar`, `eslint-config-next`, `fast-glob`, `micromatch` and `tailwindcss`.

These are a connected transitive dependency family ultimately involving **`braces <= 3.0.3`**, GHSA-vfj7-8cjw-p6xm (stack exhaustion on attacker-controlled deeply nested patterns). The public advisory currently names **no fixed version**, so `npm audit fix` cannot resolve that family without disruptive package replacements or major toolchain changes. Do **not** install an unrelated or outdated version simply to silence the audit.

The repo's existing audit baseline separately permits a known `deepmerge-ts` advisory inherited through `@prisma/config` and `prisma` (GHSA-ggr8-5vv4-36mx). That baseline does not mean the risk has been remedied.

### Required security decisions

1. Determine whether build-time glob matching can receive *untrusted* patterns in any deployment configuration, support pipeline, or runtime API. Prove isolation of user input before considering a risk exception.
2. Investigate removing `braces`-based build tooling from **production deployments**, not merely from local development. Current root dependency classifications include `tailwindcss`, so assume package presence until verified otherwise.
3. If replacement is necessary, plan a separately tested Tailwind tooling migration and verify that the active Next.js ESLint plugin can operate without the vulnerable glob dependency.
4. If an exception is unavoidable because no upstream patch exists, require **explicit release-owner acceptance**, scope it to the named advisory and package path, put an expiry/review date on it, and continue running an independent production-dependency audit. This PR does **not** change or suppress the existing audit gate.
5. Reassess the existing `deepmerge-ts` baseline before production rollout.

## Preview deployment blockers — need access to actual provider logs

GitHub reports failing Vercel and Netlify deployment statuses for the latest PR head. The currently connected Vercel account lists **no Top100 project**. Netlify deployment logs are not accessible from the current connections, so provider-specific root causes are unverified.

The repo intentionally blocks builds unless `NEXT_PUBLIC_SUPABASE_URL` matches `https://supabase.top100afl.com` through `scripts/assert-production-auth.mjs`. A preview with missing or old hosted-Supabase configuration may fail, but this is a *hypothesis*, not verified provider-log evidence. Do not remove this auth-origin guard to force a green check.

Have a release administrator inspect the Vercel/Netlify build errors in the right organization/account, decide which preview provider remains part of the release pipeline, and provide an isolated **staging** database and non-production credentials.

## Release verification still required

- Apply and rehearse the `profiles.account_status` migration in staging before shipping the corresponding auth middleware or user-management code.
- Configure rotated, server-only WhatsApp invitation URLs. Changing the repository did not revoke links already leaked in Git history.
- Independently test privileged roles, account suspend/reactivate/rollback, payments and webhook idempotency, bulk notification delivery and member/admin responsive pages.
- Run browser E2E and mobile tests against an authenticated preview. Unit tests are not a replacement for real checkout/provider checks.
- Do not merge or deploy until the release owner signs off on the security audit and staging acceptance results.

Sources:
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-wq5f-xc86-pv6w
- https://github.com/advisories/GHSA-68fv-2mgg-jv7q
- https://github.com/advisories/GHSA-ggr8-5vv4-36mx
