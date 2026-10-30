# Admin award cohorts, worklist and bulk email design

## Intent

Make the award operations console behave like one coherent staff workspace. The sidebar must identify only the current route, the team awardee worklist must prioritise distribution and follow-up work without horizontal clipping, and every award metric must act as an obvious filter. From the active award cohort, an administrator must be able to review and edit a branded operational email, confirm the exact audience, and queue reliable SMTP delivery.

## Goals

- Fix the duplicate active sidebar state for nested Team Operations routes.
- Refactor the Team Awardee Worklist into a scannable, responsive operations screen.
- Make the selected award metric visibly active and move the order queue to that cohort.
- Add an **Email this group** action for every supported award cohort/filter.
- Show the server-calculated recipient count, exclusions and a branded preview before any email is queued.
- Deliver emails through the existing transactional provider in durable, idempotent batches with retry and audit history.
- Recheck cohort eligibility immediately before each send so stale payment reminders are skipped.

## Non-goals

- Do not send a campaign while developing or verifying this feature.
- Do not add promotional/newsletter content or a general marketing campaign builder.
- Do not allow administrators to paste arbitrary HTML or scripts.
- Do not expose recipient email addresses in bulk to the browser.
- Do not replace the existing one-order email composer.
- Do not change payment, delivery or award status from the email flow.

## Anti-goals

- No synchronous loop of hundreds of SMTP calls inside an admin request.
- No browser-driven send process that stops when the tab closes.
- No recipient list supplied by the browser.
- No ambiguous button that can send immediately without a recipient count and confirmation.
- No duplicate email when a worker retries after an uncertain provider response.

## Current constraints

- The navigation marks every matching prefix active, so `/admin/team-operations/worklist` activates both the parent and child entries.
- Award metric cards are already buttons that update `statusFilter`, but the selected state is visually subtle and the queue does not receive focus or scroll context.
- The award page already loads the order and payment evidence needed to describe metric cohorts, but the server must independently derive recipients when creating a campaign.
- The existing `/api/admin/awards/email` route sends one editable message to one order through `sendTransactionalEmail`.
- Transactional mail already prefers Brevo SMTP and has Resend/Brevo API fallbacks. SMTP sends accept a deterministic message id when an idempotency key is provided.
- The existing internal email worker demonstrates `FOR UPDATE SKIP LOCKED`, leases, retry backoff and service-only RPC permissions.
- Team email templates exist for sales-rep outreach, but award-operation cohort templates need different variables and audience rules.

## Approaches considered

### 1. Durable cohort campaigns — selected

Snapshot an administrator-reviewed message and a server-derived audience into campaign and recipient records. An internal worker claims recipients in batches, rechecks eligibility, sends through the configured transactional provider and records results. This survives browser closure and deployment restarts, prevents duplicates and provides auditability.

### 2. Synchronous bulk send

Send every message inside the admin API request. This is smaller but can time out, makes the outcome uncertain and can duplicate sends when retried. Rejected.

### 3. Browser-driven individual sends

Loop over the existing one-order endpoint in the browser. This fails when the tab closes, has weak progress reporting and cannot safely distinguish an accepted provider message from a network timeout. Rejected.

## Sidebar behavior

- Determine one active navigation item: the longest matching route prefix, with `/admin` still exact.
- The worklist route highlights **Team Awardee Worklist** only. The templates route highlights **Team Email Templates** only. The parent highlights only on `/admin/team-operations` and any nested route that has no more specific configured item.
- Keep the current page-title resolver aligned with the same single-match rule.
- Add focused tests for exact, parent, child and unrelated paths.

## Worklist redesign

### Hierarchy

1. Compact page header with team selector and refresh action.
2. Small operational summary: total loaded, assigned, unassigned, verified paid and available rep capacity. Values come from the existing snapshot; unavailable data is labelled unavailable, not zero.
3. **Distribution setup** panel with year, country focus and per-rep capacity in one responsive grid. Saving settings and loading/shuffling are distinct actions with explicit pending states.
4. Rep capacity appears as a compact list with workload bars or proportional text, not a row of equally prominent chips.
5. **Awardee queue** contains search, payment/assignment/rep filters and result count. Desktop uses the existing comparison table; narrow widths use stacked summaries with identity, owner, payment state and contact actions.

### Interaction rules

- Preserve current search, filters, pagination, refresh, assignment and reassignment behavior.
- Search submits on Enter and through one labelled search action.
- Changing a filter resets to page one.
- The primary distribution action states how many eligible awardees are available and remains disabled with a nearby explanation when there are no reps, no country/year, paused auto-assignment, invalid capacity or a required database repair.
- Phone and email controls remain visible on mobile with accessible names and 44px targets.
- Long names, addresses and emails wrap or truncate with access to the full value; the page itself must not horizontally overflow.

## Award metric filters

- Every metric remains a semantic button with `aria-pressed`.
- The active metric receives a high-contrast selected border, subtle tinted background and a visible “Filtered” affordance that does not rely on colour alone.
- Clicking a metric sets its cohort, clears free-text search so the result count is understandable, then scrolls/focuses the order queue heading without moving keyboard focus unexpectedly for pointer users.
- The toolbar title and count state the active cohort in plain language.
- **Email this group** is placed beside the active cohort title, not inside each metric card.

## Supported cohorts

The campaign API accepts only a server-owned cohort identifier, not arbitrary SQL or email addresses:

- `all`
- `payment_confirmed`
- `paid_no_waybill`
- `payment_exceptions`
- `in_delivery`
- existing concrete delivery/order statuses exposed by the award filter select

The server uses the same canonical payment-evidence rules as the award operations API. `all` and concrete-status cohorts include only non-cancelled active award orders that still belong to a profile; they never include cancelled or orphaned historical rows. A recipient must have a valid normalized email and belong to an order that currently matches the cohort. Duplicate normalized emails receive one campaign message. The preview response reports eligible, missing/invalid, duplicate and currently excluded counts without returning the full address list. Campaign creation is capped at 5,000 unique recipients; a larger audience is rejected for deliberate operational review rather than silently truncated.

## Composer and preview

Opening **Email this group** presents a dialog with:

- active cohort name and server-derived eligible count;
- exclusion summary;
- editable subject, preheader and plain message body;
- a safe server-owned default for the selected cohort, loaded into an editable unsaved draft; reusable saved campaign templates are deferred until their ownership and scope model is defined;
- supported merge fields: `{{name}}`, `{{first_name}}`, `{{dashboard_link}}`, `{{payment_link}}`, `{{payment_status}}`, `{{delivery_status}}`, and `{{waybill}}` when available;
- a branded Top100 HTML preview generated from the same renderer used by the worker;
- plain-text preview;
- optional test-email action addressed to the authenticated administrator;
- final confirmation stating the exact eligible count and cohort.

Administrators edit text, not raw HTML. The renderer escapes substituted values and wraps the message in an accessible Top100 template with `lang`, `dir`, a title, one heading, descriptive links, sufficient contrast and a plain-text alternative. Operational cohort messages must remain factual and non-promotional.

## Campaign data model

Add service-only tables:

### `award_email_campaigns`

- id, cohort, subject, preheader, body, template snapshot/version;
- created_by, created_at, confirmed_at;
- status: `draft`, `queued`, `processing`, `completed`, `completed_with_errors`, `cancelled`;
- eligible, queued, sent, skipped and failed counts;
- completion timestamp and last error summary.

### `award_email_campaign_recipients`

- campaign id, order id, profile id, normalized email and display name;
- cohort evidence snapshot needed for merge fields;
- deterministic unique key per campaign and normalized email;
- status: `pending`, `processing`, `sent`, `skipped`, `retry`, `delivery_unknown`, `dead`;
- attempts, available/lease/sent timestamps, provider-safe error and skip reason.

RLS is enabled, all public/anonymous/authenticated table privileges are revoked, and only service-role APIs/RPCs can create, claim or finish records. Read access for the admin UI is through authenticated admin routes, not direct browser table access.

## API contract

- `GET /api/admin/awards/email-campaigns/audience?cohort=…` returns the current count/exclusions and default template data.
- `POST /api/admin/awards/email-campaigns/test` validates and renders the draft, then sends one test to the authenticated admin after a strict rate limit. It does not create recipient rows.
- `POST /api/admin/awards/email-campaigns` validates the draft and cohort, re-derives the audience, creates the immutable campaign snapshot and recipient queue in one database transaction/RPC, and returns campaign counts.
- `GET /api/admin/awards/email-campaigns/:id` returns progress counts and a bounded list of failures/skips without exposing the whole recipient directory.
- Every mutation requires admin authentication and same-origin protection. Campaign creation is rate-limited and rejects an empty audience.

The browser never sends recipient emails, provider credentials, HTML or final counts.

## Worker and delivery integrity

- Add a CRON-protected internal worker that claims a bounded batch using a lease and `FOR UPDATE SKIP LOCKED`.
- Before sending, reload the order/payment projection and verify it still matches the campaign cohort. If it no longer matches, mark it skipped. For example, someone who paid after a payment-review campaign was queued must not receive the stale reminder.
- Render per-recipient HTML and plain text from the immutable subject/body snapshot and server-owned merge data.
- Use `award-email-campaign/<campaign-id>/<recipient-id>` as the stable message identity. This provides API idempotency where supported and a stable SMTP `Message-ID`, but SMTP alone does not guarantee deduplication after an ambiguous timeout.
- Extend the internal send result so the worker can distinguish explicit pre-acceptance retryable rejection, permanent rejection and ambiguous transport failure. Retry only an explicit retryable failure. An ambiguous SMTP timeout becomes `delivery_unknown` for manual review and is not automatically retried, preventing an uncertain accepted message from being duplicated. Permanent rejection becomes dead/failed.
- Finalization updates campaign counts from recipient rows rather than incrementing untrusted counters.
- Add a Dokploy schedule using the existing secret pattern. The worker stays safe if overlapping invocations occur.

## Audit and safeguards

- Record campaign creation, test send, cancellation and completion in the admin/team audit trail with counts and cohort, never the body or recipient list in general logs.
- The confirmation dialog names the cohort and eligible count; the queue action is disabled until the admin explicitly confirms.
- A queued campaign can be cancelled only for recipients not already processing/sent.
- Do not log message bodies, full provider responses or recipient addresses.
- Do not automatically resend an old completed campaign; creating another campaign produces a new id and confirmation step.

## States

- audience loading, ready, empty and unavailable;
- draft valid/invalid;
- preview loading/error;
- test sending/sent/error;
- confirmation;
- campaign queued/processing/completed/completed-with-errors/cancelled;
- recipient skipped because cohort changed;
- provider retry, permanent failure and delivery-unknown/manual-review.

## Verification

- Navigation tests prove only one sidebar item is active.
- Worklist component tests cover filters resetting pagination, disabled distribution reasons, responsive record actions and reassignment preservation.
- Cohort resolver tests cover all metrics, concrete statuses, invalid email, duplicate email and payment-evidence edge cases.
- Campaign database tests cover atomic audience snapshot, uniqueness, claim leases, overlapping workers, retry/dead behavior, cancellation and completion counts.
- Renderer tests cover escaping, merge fields, branded HTML accessibility and plain text.
- API tests cover admin/same-origin/rate-limit enforcement and rejection of client-supplied recipients or HTML.
- Worker tests prove eligibility recheck, idempotency key stability and partial-provider failure handling.
- Inspect worklist and awards pages at approximately 360px, 768px and 1280px, including long names, large counts, empty cohorts, selected metrics and composer keyboard focus.
- Send no production email during verification; provider calls are stubbed.

## Deployment dependency

The database migration and application code must be deployed together, followed by creation of the internal worker schedule. Until the migration is present, the campaign action returns a clear setup-unavailable state and existing individual email remains unaffected.
