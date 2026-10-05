# Production incident repair — 5 October 2026

## Confirmed and corrected

- 75 awardee avatars referenced the old hosted Supabase storage. All corresponding VPS objects were verified over HTTPS before any URL change.
- `scripts/repair-legacy-storage-urls.py --apply` verified and corrected 165 image references across awardee and member records. A restricted JSON backup of affected rows was saved on the VPS under `/root/top100-repair-backups/`. The script defaults to dry-run and does not replace URLs for missing or unreadable objects.
- One migrated Auth record had a null `email_change` field. Its row was backed up, the field changed to an empty string, and the admin user-list API was verified successfully afterward.
- Next's bundled compression redirects `on('drain')` to Gzip while one-time listeners remove themselves from the response. A local reproduction confirmed a retained listener after a drain event. Origin compression is disabled; Cloudflare's Brotli response encoding was verified.
- Deployment IDs enable Next's documented navigation version check. An explicit deployment ID is supported for Docker builds; a source fingerprint is used when Git metadata is absent.
- Avatar processing now decodes raster photos, resizes them to 512px, strips metadata and uploads WebP. Invalid photos receive a 400 response rather than an unsupported original-byte upload.
- Onboarding and recovery failures log the operation, internal member ID and error code, without passwords, tokens, submitted text or email addresses. Onboarding rejects cross-site cookie-authenticated writes.

## Verification

- Production smoke test used a temporary private profile and Auth account: password sign-in, authenticated role lookup, onboarding completion, profile reload, avatar upload, public image read, avatar reload, recovery-link generation and verification, password change and subsequent sign-in all passed. Test image and account were removed.
- Recovery was tested using a generated link without sending email. This verifies the recovery flow, not mailbox delivery or inbox placement.
- Local security/regression suite: 115 tests passed. Additional focused auth/profile/media suite: 47 tests passed (overlaps with the security suite).
- TypeScript and production build passed before release.

## Domain origin regression found during post-release verification

The cookie-based test on `www` returned HTTP 403 from the origin guard. Bearer tests bypass this guard, which is why the earlier API test passed. The guard now accepts both explicitly owned Top100 production origins behind the proxy, while continuing to reject unrelated subdomains, lookalike domains and cross-site requests. The member password-reset endpoint uses the same trusted-origin check. Regression tests reproduced the failure before the fix.

## Not automatically resolved

- One Auth account has no profile and no awardee record with the same email. A similarly named awardee has no email. Linking on name alone would grant unverified access; administrative identity confirmation is required.
- Invalid passwords, reused passwords and expired/consumed links are expected Auth rejections, not evidence that access controls should be relaxed.
- User-specific complaints remain open until matched to a verified flow or confirmed by the member. No claim that all tickets are resolved should be made.
