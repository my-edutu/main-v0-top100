# Top100 password recovery email

In Supabase Authentication → Email Templates → Reset password:

- Subject: `Choose your Top100 password`
- Body: paste `recovery.html`.

Keep `{{ .ConfirmationURL }}` intact. Supabase verifies the single-use recovery token before redirecting to the requested password form. Do not replace this with a plain link to the form or a cohort access code.

In Authentication → URL Configuration, allow the production recovery destinations:

- `https://www.top100afl.com/auth/reset-password?area=member`
- `https://www.top100afl.com/auth/reset-password?area=admin`

Brevo SMTP settings: host `smtp-relay.brevo.com`, port `587`, username from Brevo SMTP login, password from Brevo SMTP key. Verify transactional sending is active and the sender domain is authenticated. Disable click tracking for Auth email links. Check both Supabase Auth email limits and Brevo account quota.

Verify using an existing authorized account: request recovery, confirm delivery in Brevo, open the received link, choose a new password, then sign in. A `/recover` HTTP 200 alone does not establish mailbox delivery or prove the account exists.
