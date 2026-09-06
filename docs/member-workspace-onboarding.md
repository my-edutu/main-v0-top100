# Awardee workspace and mandatory onboarding

Approved direction: every awardee completes onboarding before dashboard access. Existing claimed profiles are prefilled, but still require review and completion. Four individual information steps (headline, location, field, BIO) lead to a review page. Progress persists in the existing profile and notification preferences; no schema migration is required. Setup saves do not consume the BIO edit quota.

The server middleware blocks dashboard deep links and member feature APIs until completion. The member provider also gates client navigation. Profile setup and avatar upload remain available during setup. Database failures fail closed. The local development demo exercises the wizard without writing real member data.

Dashboard and Discover use Top100 event photographs with dark overlays, and the existing orange-to-amber gradient for controls. Me uses a profile summary and settings list. Messaging uses existing components, with flexible grid tracks and participant avatars. Calendar and activity remain connected to existing event invitation, opportunity, conversation and notification services. Admin events are managed at `/admin/events`; dashboard broadcasts at `/admin/member-hub`; direct conversations at `/admin/member-conversations`.

## Deployment configuration

- `RESEND_API_KEY`: server-only Resend key.
- `RESEND_FROM_EMAIL`: verified sender, for example `Top100 Africa Future Leaders <info@top100afl.com>`.
- `NEXT_PUBLIC_SITE_URL`: deployed Top100 origin for email links.
- `TOP100_WELCOME_SENDER_ID`: Paul Light's existing admin profile UUID. Without this, an unambiguous exact admin name match is required. No account is fabricated.

Resend is used when configured. Existing Brevo support remains available otherwise. Message alerts respect member preferences and existing hourly email throttling. Email failure does not remove the saved in-app message. In-app message views poll the server; they are not WebSocket subscriptions.

The welcome message is inserted with a deterministic UUID to prevent duplicate messages on repeated visits. It is retried on subsequent dashboard visits when sender configuration is missing. The greeting switches after the first three distinct authenticated sessions recorded after onboarding. No historical message broadcast is performed by installation.

Verification uses the development-only demo and read-only table reachability checks. Real outbound email requires the above credentials and a controlled delivery test.
