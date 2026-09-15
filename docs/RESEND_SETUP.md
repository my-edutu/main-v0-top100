# Resend transactional email setup

The application now uses Resend for member emails:

- welcome and founder greeting after a new account is created;
- sign-in confirmation after a successful member login;
- payment confirmation, award dispatch, tracking, and delivery updates.

Add these server-only environment variables in local development and the deployment platform:

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Top100 Africa Future Leaders <hello@your-verified-domain.com>"
TOP100_FOUNDER_NAME="Founder Name"
NEXT_PUBLIC_SITE_URL="https://top100afl.com"
EMAIL_LOGO_URL="https://top100afl.com/Top100%20Africa%20Future%20leaders%20Logo%20.png"
```

Verify the sending domain in Resend before using a custom `RESEND_FROM_EMAIL`. Until then, use `onboarding@resend.dev` for testing if Resend permits it for the account.

`EMAIL_LOGO_URL` must be an HTTPS URL that email clients can reach. The default points to the production Top100 site; set it explicitly if the production domain or logo path changes.

The existing `award_notification_log` migration remains required. It prevents duplicate award emails when Paystack retries a webhook. `BREVO_API_KEY` remains a fallback for the award status path during migration, but new deployments should configure Resend.
