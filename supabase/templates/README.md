# Top100 password recovery email

The app sends password recovery emails through its transactional Brevo mailer. The forgot-password page calls `/api/auth/password-reset`; that route uses Supabase Admin `generateLink` to mint a recovery token, then sends the branded email through `sendTransactionalEmail`. Supabase Auth's own reset-password email template is not used for this flow. `recovery.html` is retained as a visual reference for the email design.

Configure these variables on the **web app service** in Dokploy:

- `BREVO_SMTP_HOST=smtp-relay.brevo.com`
- `BREVO_SMTP_PORT=587`
- `BREVO_SMTP_LOGIN` and `BREVO_SMTP_KEY` from the Brevo SMTP settings
- `BREVO_SENDER_EMAIL` set to an authenticated sender on the Top100 domain
- `SUPABASE_SERVICE_ROLE_KEY` for the self-hosted Supabase project used by the app
- `NEXT_PUBLIC_SITE_URL=https://www.top100afl.com` (or set server-only `TOP100_SITE_URL`)

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. In Supabase Auth → URL Configuration, allow both recovery form destinations:

- `https://www.top100afl.com/auth/reset-password?area=member`
- `https://www.top100afl.com/auth/reset-password?area=admin`

The email link carries the token hash in the URL fragment. The browser verifies it only when the user submits the new-password form, so opening the link in a mail security scanner does not consume it. Keep Brevo click tracking disabled for these messages.

Verify with an authorized test account: request recovery, confirm delivery in Brevo, open the link, choose a new password, and sign in. The page deliberately gives the same confirmation whether or not an account exists. A successful HTTP response alone does not establish mailbox delivery.
