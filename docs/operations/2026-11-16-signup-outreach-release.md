# Signup and award outreach release — 16 November 2026

Deployed `top100-outreach:20261116` to Dokploy service `top100-frontend-hymlzt` on the active self-hosted server. Release ID: `outreach-20261116`. Swarm reports update completed. Previous running image is tagged `top100-outreach:rollback-20261116`.

The isolated build used production checkout commit `831a75f` plus the nine signup/outreach files listed in `/var/tmp/top100-outreach-overlay.tgz`. It excludes unrelated working-tree changes. Build source and logs remain at `/var/tmp/top100-outreach-release-20261116` and `/var/tmp/top100-outreach-build.log`. This image was deployed directly; merge/push the corresponding application changes before a normal Git-based Dokploy redeploy to avoid replacing this release with older source.

Changes include provider-neutral signup-code and outreach delivery, separate profile-created/no-order audience, saved-template metadata normalization, and the branded 2026 outreach renderer. No schema migration was needed for this application release.

Validation: local typecheck passed; 35 focused signup/outreach tests passed; isolated Docker production build passed. Running-container checks: signup 200; malformed claim 400; protected admin API 401; profile-only audience present in deployed bundle. Public signup serves the new deployment ID; unmatched directory search returned 200 with an empty result. Brevo read-only account/sender checks passed, with three active senders. Runtime started without error. Campaign and recipient tables were both empty after deployment.

No email-send endpoints, valid signup-code requests, campaign queue actions, or payment checkouts were invoked. Actual email receipt and a completed claim remain untested because the user explicitly prohibited sending emails.

Rollback: `docker service update --image top100-outreach:rollback-20261116 top100-frontend-hymlzt` on the active Dokploy host.
