# Award outreach workspace

The user requested implementation of the proposed recovery and awareness plan, including 2026 unpaid awardee cards, profile/link separation, email data exports and templates. Build in the existing awards console and existing SMTP integration. Preserve unrelated checkout changes.

Use the awardee directory as eligibility truth, canonical payment evidence as payment truth, and explicit profile links with normalized email matching as a fallback. Deduplicate people across duplicate directory rows and orders. Default to 2026 and permit other directory years and all cohorts from 2023. Separate confirmed, needs verification, unfinished orders, no order, and no profile. Unpaid means no verified payment, not proof of debt. Never infer an individual historical click from aggregate analytics. New tracked links provide recorded visits; scanners can produce visits, so the UI must describe the observation accurately.

Extend the admin page with responsive audience cards, year and segment filters, searchable member rows, SMTP mail-merge CSV and email copying. Provide editable, reusable recovery, awareness, follow-up, final check-in, verification and paid-care templates with real award imagery, server-owned fees, separate delivery explanation, profile-claim/payment URLs and support. Never invent invite codes, fulfillment dates, discounts or deadlines.

Store staff owner, contact date, next follow-up, obstacle, notes and suppression. Suppressed people and unresolved payment cases are excluded from payment campaigns. Bulk email uses a durable bounded queue, recipient eligibility rechecks, unique campaign/email recipients, and explicit user confirmation. No automatic campaign or production message is sent during development. Unknown delivery is held for review rather than retried. Worker and migration deployment are explicit dependencies.

Compare per-campaign accepted messages, skips, failures/unknown delivery and subsequently verified paid members. This is observed conversion, not causal attribution. Offer suggested initial/day-four/day-eight templates and due follow-up work rather than silently enrolling members into an automatic sequence.

Alternative considered: browser-side SMTP loops are vulnerable to interruption and duplicate sends. CSV alone is useful but cannot support shared follow-up history, eligibility rechecks or campaign outcomes. Use CSV plus a persistent outreach queue.

Verification: business-logic fixtures for duplicate identities, multiple orders, legacy and canonical payment evidence, mixed years, unknown visits, unsafe CSV cells, suppression and missing contact data; admin/origin/validation API guards; worker rechecks and uncertain send behavior; actual PostgreSQL schema/claim tests; type/lint/tests and narrow/wide browser inspection with fixture data only.
