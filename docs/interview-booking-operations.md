# Internal interview booking operations

The booking schema is additive. Before using `/dashboard/me/interview` or the Requests & Schedule panel, apply `supabase/migrations/20261007145938_internal_interview_booking.sql` to the Supabase project. The migration requires the existing `interview_applications`, `profiles`, and `user_notifications` tables; on a fresh setup, run the existing member-hub setup first. The local Supabase database was unavailable while this was built, so the migration has not been applied or executed here.

## Production configuration

Set these server environment variables in the deployment:

- `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` for interview email delivery; verify the sender in Brevo.
- `INTERVIEW_ADMIN_EMAIL` for the interview team, or use the existing `ADMIN_NOTIFICATION_EMAIL`.
- `CRON_SECRET` as a long random secret. Vercel sends it as a bearer token to configured production cron routes. `INTERVIEW_WORKER_SECRET` can be used on another scheduler instead.
- `NEXT_PUBLIC_SITE_URL=https://www.top100afl.com` for links in email.

The repository config runs the worker once per minute. Vercel Hobby plans only support daily cron jobs; this cadence requires Vercel Pro or another scheduler that calls `/api/internal/interview-bookings/process` every minute with `Authorization: Bearer <CRON_SECRET>`. Cron invocations run only against production deployments. The worker expires proposals, claims leased outbox jobs, delivers emails and dashboard notifications, and retries failures with backoff.

## Enable appointment times

An admin opens `/admin/interviews` → Requests & schedule → Settings and explicitly selects working days and hours in the team time zone. Defaults are Africa/Lagos, 30 minutes, 15-minute buffer, three bookings per day, 24-hour notice, and 48-hour proposal expiry; working windows are intentionally empty. Add excluded dates as needed. Staff provide a secure meeting URL before proposing video appointments. Written interviews can be proposed without a meeting URL.

A proposed slot is held while the member responds. Members accept, ask for another time, or cancel. Confirmed appointments include an authenticated calendar download. Outbox failures appear in the admin panel and can be retried; Brevo email delivery cannot be guaranteed exactly once if a process stops after the provider accepts a message.

The internal flow does not import existing Google Form submissions or change the public interview application route. Legacy applications without a signed-in member link remain available to staff but are not claimed by matching email addresses.
