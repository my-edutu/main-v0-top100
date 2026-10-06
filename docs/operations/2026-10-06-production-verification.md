# Production verification — 6 October 2026

Frontend deployment completed at 06:16 UTC. Runtime has the site URL,
Turnstile public/secret keys, both allowed hostnames, and Brevo key configured.
Secrets were not recorded.

## Verified

- Both apex and www cookie requests pass the origin guard (unauthenticated: 401).
- Temporary cookie-authenticated account: profile check 200, onboarding 200,
  profile edit/reload 200, invalid image 400, valid avatar upload 200, public
  avatar retrieval successful, avatar persisted after reload.
- Recovery link generation, verification, password change and subsequent login
  succeeded without sending email. Test account and image were removed.
- Profile API timings from VPS: roughly 269–815 ms. These are not mobile page-load timings.
- Pending claim and single-member approval functions passed with a temporary
  transaction and service-role JWT context. Transaction rolled back.
- Two real registrations and two pending claims observed after the rebuild.
- Brevo account credential check returned 200; inbox delivery was not tested.

## Realtime repair

The seeded tenant is `realtime-dev`, but Kong used upstream `realtime:4000`,
resulting in repeated `TenantNotFound` errors.

Added Docker network alias `realtime-dev.supabase-realtime` to Realtime's
`default` network and changed Kong Realtime upstream URLs to that hostname.
Backed up existing server files before changing them. Recreated only Realtime
and restarted Kong. The alias is also saved in Dokploy's stored Compose source.
Kong configuration resides in the persistent Dokploy bind-mounted file:
`files/volumes/api/kong.yml`. Preserve these upstream URLs if regenerating files.

Public WebSocket opened and channel join returned `ok`; no new TenantNotFound
errors during the post-fix check.

## Remaining limits

- Welcome sender needs identity confirmation: configured fallback names do not
  match a unique admin. Do not guess which admin should send messages.
- Existing orphaned account requires identity review, not automatic name linking.
- Actual email delivery and affected members' devices are not proven by API tests.
- No real members were bulk approved and no support replies were sent.
