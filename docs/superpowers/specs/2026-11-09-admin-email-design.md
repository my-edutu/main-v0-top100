# Top100 admin email: proposed design

## Goal

Give authorised Top100 administrators one place to compose, preview, schedule and review email campaigns, with clear information about delivery and failures. Keep the existing award-outreach functionality and the Gabriel/Stalwart sender intact.

## Approaches considered

1. **Recommended: Listmonk as a private campaign service, integrated into Top100 admin.** Listmonk supplies campaigns, scheduling, templates, subscriber lists and bounce handling. Top100 retains its admin experience and controls eligibility. Stalwart remains the mail server. This adds a service and separate Postgres database and requires careful synchronisation.
2. **Extend Top100's existing outreach worker.** This uses the current Next.js and Supabase stack and keeps one source of truth, but the team must build and maintain scheduling, campaign management and reporting.
3. **Mautic.** This is a broader marketing automation platform. Its larger scope and operational footprint do not appear necessary for the requested campaign workflow.

## Proposed architecture

- Deploy a pinned Listmonk release privately on the existing Dokploy server, with its own durable PostgreSQL database and backups. Do not expose its database, API credentials or admin interface publicly. Verify current version and licence before deployment.
- Add an Email section to Top100 admin, protected by existing server-side admin authorisation. The browser calls Top100 APIs; those call Listmonk over the private network using a narrowly scoped secret. Never expose credentials to the browser.
- Compose drafts, preview merged values, send a test to an explicitly selected address, review the audience and schedule or queue a campaign. Show schedule times in Africa/Lagos and store them in UTC. Require an explicit review and confirmation at the point of scheduling or sending.
- List scheduled, sending, paused, cancelled, completed and failed campaigns; show their subject, content, audience and timestamps. Preserve and show existing Top100 award-outreach history separately or with an explicit source label.
- Present Listmonk's accepted/sent counts accurately: SMTP acceptance is not proof of delivery to an inbox. Add delivery, temporary-failure and permanent-failure states only where authenticated Stalwart events provide evidence. Preserve uncertain outcomes and do not blindly retry them.
- Continue to re-evaluate awardee eligibility and unsubscribe/suppression status at send time through a Top100-controlled delivery gateway. Native Listmonk SMTP sending alone cannot enforce current Top100 payment state for each recipient. The gateway must handle idempotency and ambiguous SMTP outcomes, and its skipped messages must not be presented as delivered. A scheduled campaign must not accidentally email people who paid, unsubscribed, or became ineligible after scheduling. The existing coupon-expiry check must remain in force for coupon campaigns.
- Treat current Top100 suppression records as authoritative until a safe two-way synchronisation is verified. Listmonk unsubscribes, one-click POSTs, permanent bounces and complaints must feed Top100 suppression before another campaign can send; synchronisation failures must block sends rather than silently re-subscribe people. Do not infer or fabricate historical consent records.
- Configure Stalwart event or bounce processing with authentication and deduplication. Stalwart's existing monitor protects the current award-outreach worker; it does not automatically protect Listmonk subscribers. Report spam complaints only if an actual feedback source is connected.
- Protect recipients' privacy: use the approved branding and personal unsubscribe link, avoid enabling individual open/click tracking by default, retain only necessary history, and avoid exporting recipient data to third parties.

## Implementation and validation

1. Audit Listmonk's campaign API, scheduling, one-click unsubscribe, privacy defaults, sender limits, licence and actual delivery-event support using a pinned version.
2. Build a private local or isolated test environment with a disposable SMTP sink and test data. Do not connect real lists or send to recipients during development.
3. Implement secure Top100 admin API integration and a responsive admin interface. Verify authorisation, draft preservation, test-send boundaries, scheduling, cancellation, duplicates, recipient changes, delivery uncertainty and failure states.
4. Verify suppression and bounce propagation in both directions, including an unsubscribe between scheduling and sending and a coupon expiring before send time.
5. Deploy the pinned Listmonk service and Top100 changes on Dokploy, back up relevant data, and run a single authorised test to the existing test inbox. Do not send or queue a real campaign during setup.

## Open risks

Listmonk counts a successful messenger request as sent, so a gateway that safely skips an ineligible recipient needs separate, truthful outcome reporting. Listmonk is a one-way campaign manager, not a Gmail-style mailbox; replies would continue to the configured reply address. Gmail and other providers can classify mail as Promotions or spam regardless of the interface. SMTP acceptance and tracking pixels cannot prove that a person read a message. Listmonk's AGPL-3.0 licence and any obligations arising from modifications or network use should be reviewed before distribution or integration.
