# Festival registration and tickets

`/dashboard/festival` collects name, international phone number, and physical award pickup intent. Only approved awardees with a current, verified physical award payment can register or download a ticket. This applies to both pickup choices. Selecting Yes refreshes payment verification; unpaid members see Get your award, while pending/unavailable verification asks them to check status before another payment. The server independently enforces payment at registration and ticket download, including after refunds.

Apply these migrations in order before deploying the ticket routes:

1. `supabase/migrations/20261031031216_festival_attendance_interests.sql`
2. `supabase/migrations/20261031121526_festival_admission_tickets.sql`

Both preserve service-role-only access and RLS. `registered_at` identifies a new payment-verified registration; existing interest rows remain unregistered. `ticket_id` is a stable UUID, retained on edits. A stored registration never overrides current payment truth. No new payment configuration is introduced.

After registration, a named ticket is rendered with the shipped Noto Sans font and the supplied festival image. It includes 30 November 2026, University of Lagos, time to be confirmed, ticket reference, collection preference, and the payment/ID requirement. Authenticated members download a PNG through `/api/member/festival-interest/ticket`. No public URL exposes member names, phone numbers, or tickets.

Registration triggers Brevo SMTP through `lib/email/send.ts`, to the signed-in account email, with the named PNG attached and a dashboard link. Configure `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL` and optionally `BREVO_SMTP_HOST`, `BREVO_SMTP_PORT`, `BREVO_SENDER_NAME` in the server deployment. Festival mail explicitly requires Brevo SMTP and does not fall back to Resend or the Brevo API. An enabled Brevo relay alone does not configure the application's SMTP credentials. Do not put these credentials in browser/public environment variables.

An atomic two-minute claim prevents concurrent sends; a recorded SMTP acceptance suppresses repeats. Failed rendering or delivery releases the claim and persists a retryable state. Failure never rolls back registration: the member can download or use Retry ticket email (`POST /api/member/festival-interest/ticket-email`, authenticated and rate limited). Abandoned claims expire. A send accepted immediately before a database outage can be sent twice on retry; stable Message-ID is for correlation, not guaranteed SMTP deduplication. There is no automatic background retry worker for festival tickets. SMTP acceptance is not evidence of inbox delivery.

Pickup intent does not change an award order’s courier, dispatch, or collection state. Copy explains that the award and certificate will be prepared for festival collection, or dispatched after delivery arrangements are confirmed. Current responses and ticket references appear in `/admin/festival`; legacy interests are labeled separately. Staff must check current payment in Awards when verifying admission or arranging fulfillment; the image itself is not a live payment receipt or an automated entry scanner.

The development sample account enforces the same gate against its isolated sample payment record. Preview tickets are marked PREVIEW and no email is sent. It never creates a real registration or payment. `tests/festival/migration.sql` checks both migrations, old interest preservation, claim exclusion/expiry, unique identity, and private access in a disposable local `festival_test_*` database, then rolls back its changes.

The exact user-attached image is saved as `/public/images/afl-festival-2026.webp`. Keep public assets outside protected dashboard URLs so the Next image optimizer can read them without a member session.
