# Festival admission and ticket implementation plan

**Goal:** Gate admission on confirmed award payment and provide emailed/downloadable tickets.
**Architecture:** Existing Next routes, server-owned payment verification, private Supabase registration, existing Brevo SMTP, Sharp PNG rendering.
**Spec:** ../specs/2026-10-31-festival-tickets-design.md

1. Add failing behavior tests for unpaid/pending/unavailable registration rejection, both pickup preferences, authenticated download, refund blocking, and email retry/deduplication.
2. Add private registration/ticket/email claim fields with an additive migration. Keep legacy interests unregistered. Implement server registration/payment guards and scoped downloads.
3. Add a branded PNG ticket renderer and email-safe transactional HTML. Extend the shared transport for in-memory attachments and explicit Brevo SMTP requirement; verify no fallback when SMTP is required.
4. Update the festival form, saved summary, and isolated demo routes. Show dates and dispatch guidance; check payment on collection choice; only confirmed members register.
5. Run focused and full tests, TypeScript, lint, and a production build. Exercise unpaid, paid, unavailable, and summary/download states at phone and desktop widths with fixtures. Inspect the rendered ticket and email. Do not email real members during checks.
