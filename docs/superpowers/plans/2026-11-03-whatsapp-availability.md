# Rep-reported WhatsApp availability

The user approved a manual, clearly labelled "Not on WhatsApp — rep reported"
flag. Store routing context in the existing awardee metadata, with a normalized
phone snapshot, reporting membership and server timestamp. Ignore stale reports
when the phone number changes. The current assigned active rep may mark or undo
it through a same-origin, authenticated API backed by a service-only RPC.

Show the flag beside the contact controls on worklists, the rep overview queue
and awardee profiles. Keep tracked Call and existing Email actions available;
replace the default WhatsApp action with the report and Undo control while
flagged. Saving a report never creates contact/follow-up evidence, changes
assignments, verifies payments or awards commission. Keep existing historical
credit grace intact.

Test phone-snapshot matching, input/auth/ownership/CSRF guards, persistence/undo,
permission grants, and unchanged contact/financial records. Verify mobile and
wide layouts using synthetic data only. Apply the RPC migration on the active
self-hosted Supabase server, then publish through Top100 Dokploy and verify live
read-only health. Do not mark real awardees during testing.

## Verification and live migration

- 34 team unit/API tests, six disposable-Postgres integration tests, TypeScript
  and scoped lint passed (existing unrelated lint warnings remain).
- Browser fixtures verified mark, reload persistence, changed-phone handling,
  undo, error recovery and Call/Email availability at 390px and 1280px.
- The report does not change qualifying-contact counts or financial records.
- Applied the migration on the active self-hosted database. SQL SHA-256:
  `716cc006823408a473b8709f52458f10d1a015c18da871b5fe6aa6310a34bf77`.
  The live/test RPC definition fingerprints match. Only service_role can execute
  it; anonymous/authenticated direct execution is denied. No real reports were
  created during verification.
