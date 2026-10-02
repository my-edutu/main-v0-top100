# Member email outbox worker

Apply the Supabase migrations before enabling the member email outbox:

- `20261001090000_verified_claim_concurrency.sql`
- `20261001100000_onboarding_burst_safety.sql`
- `20261001110000_member_profile_atomic_updates.sql`
- `20261001120000_bounded_rate_limit_cleanup.sql`
- `20261001130000_dashboard_journey_bootstrap.sql`
- `20261001140000_magazine_webhook_order_lock.sql`

The Cloudflare Worker runs the outbox processor every minute, claiming at most
25 jobs per run. Failed sends retry with increasing delays and move to `dead`
after eight attempts. The worker needs the same secret as the Next.js app:

```sh
npx wrangler secret put EMAIL_OUTBOX_WORKER_SECRET
```

Set `EMAIL_OUTBOX_WORKER_SECRET` to the same value in the app runtime. Keep
`APP_ORIGIN` pointed at the deployed application. The worker calls the protected
`/api/internal/email-outbox/process` endpoint; it does not send email itself.
