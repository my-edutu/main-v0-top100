# Awardee Worklist Design System

## Purpose

Help sales reps contact awardees, support payment completion, and see verified rewards. The worklist must remain useful as the team grows and must reflect the existing payment and assignment system.

## Design direction

- Put the people list first. Keep the header and page copy short and sales-oriented.
- Use white record surfaces on the warm neutral page, thin borders, and no card shadows. Orange marks links and actions; moss green marks a payment verified by the payment system.
- The admin worklist exposes only Name, Email, Phone, Country, Address when available, payment state, and contact actions. Email and call icons sit together on the same row and appear only when their contact value exists.
- A confirmed linked payment turns the payment cell and row tint moss green with a check. The state comes from the verified order projection and is never set by a contact action.
- The canonical awardee record supplies name, email, and country; linked profile or awardee metadata supplies phone/address, with an existing award order as an address fallback. Missing optional details stay blank rather than being inferred.
- Paginate the list. Capacity defaults to 100 active awardees per sales rep and is configurable by a Top100 administrator from 1 to 5,000; it is not a page size or team-wide limit.
- The administrator chooses a country focus for each shuffle. Nigeria is the default, and the saved focus applies to year-pool loads and automatic assignments.
- Use a purposeful awardee illustration only for a genuinely empty list. Search and filtered-empty states explain the next step without extra decoration.

## Algorithm and money contract

1. Team worklists are year-based projections of Top100's canonical `awardees` list. An admin selects a year and country, then loads its unpaid records; the assignment transaction shuffles that matching pool and distributes records to the least-loaded active reps, with a hard limit set by the team's configured capacity.
2. The cap counts active assignments, including records whose payments are already verified. Historical assignments above 100 remain intact but receive no further assignments until under capacity. No mass reassignment is performed.
3. Paid, pending, and refunded records are not loaded into a new year worklist or automatically assigned. A payment verified before assignment remains unattributed; the system must not create a reward for an agent who was not responsible at payment time. Admin reconciliation remains available for linked payments and commissions.
4. Payment state comes only from the linked `award_orders` payment source (matched by public awardee/profile identity). The worklist shows a moss check only when the synced team record is `paid`; pending, failed, and refunded records do not show it.
5. A verified payment for an actively assigned awardee creates one append-only commission entry for that active agent. The current seed rules pay NGN 2,000 (`200000` minor units) for NGN and USD payment orders. Duplicate callbacks cannot create duplicate rewards. A refund adds a negative reversal and changes the visible payment state to refunded.
6. The reward shown in the UI is derived from the ledger, not a client-side counter or a manually editable “paid” flag. Assignment and payment history remain auditable.

## Critique and refinement

### Draft 0

The first sketch was a large awardee table, a 100-person cap, a green paid mark, and a ₦2,000 reward.

### Critique 1

- A 100-row phone table would be hard to scan and could hide contact actions.
- “100 awardees” could mean 100 rows per page, 100 total, or a per-rep workload limit.
- A browser-only limit can be bypassed; auto-assignment and manual reassignment must enforce the same cap in the database transaction.
- Treating a paid label as proof, or incrementing a reward in the UI, could claim payment or commission that the payment system has not confirmed.

### Revision 1

The list becomes a paginated, responsive contact worklist. The limit means 100 active assignments per sales rep. Both assignment paths enforce it under the existing per-team lock. Payment and rewards continue to come from the verified order sync and append-only ledger.

### Critique 2

- Payments may arrive before assignment, after assignment, or be refunded. A green mark cannot itself imply that a commission was created.
- Moving a paid record to another rep after payment must not silently move the original reward.
- Existing teams may already have agents above the proposed limit. Deleting or reassigning their records to meet a new limit would be destructive.
- A fixed “₦2,000 earned” label could disagree with ledger entries, currency rules, pending holds, or reversals.

### Critique 3

- A spreadsheet can be an outdated or partial copy of the awardee directory and can omit the canonical identity needed to connect payment events safely.
- Public email addresses are not guaranteed unique. Matching on a non-unique email could mark the wrong person paid or reward the wrong agent.
- A payment can be verified before assignment. Syncing that old payment against the agent currently assigned could award the wrong person.

### Final refinement

The worklist now selects a year and country from the canonical Top100 awardee directory. Nigeria is the default country. It copies only unpaid records into the team projection, keeping the canonical awardee ID and profile link intact; no external spreadsheet or new awardee record is created. A payment verified before assignment remains uncommissioned, because reward attribution checks the assignment active at the payment timestamp. Payment truth and reward attribution stay separate but linked: status comes from the synced order projection; amount and owner come from the ledger. Refunds create reversals. The configurable per-rep cap prevents new assignments above the chosen limit while preserving existing records. The table shows separate contact columns and verified payment status; rewards remain auditable on Earnings.

### Implementation review

- A paid legacy row without a payment identity must not get a green check. The roster now requires a linked public awardee/profile identity before displaying “Verified”; otherwise it flags the row for linking.
- Assignment capacity must count only eligible sales reps. The admin reassignment list now excludes team leaders, shows each rep’s active workload, disables full reps, and the SQL RPC remains authoritative under the team assignment lock.
- Optional contact fields should not create dead controls. The phone, WhatsApp, and email actions only render when that contact method exists.
- The worklist should stay readable on mobile and avoid decorative elevation. Mobile records use separately labeled contact fields, and the awardee surfaces use the existing flat, shadow-free style.
- An order may have both an exact public awardee ID and a broader profile ID. Payment synchronization now prefers the exact awardee match so a second campaign row for the same profile cannot win just because it was created earlier.
- Central Admin Panel actions are authorized by the platform admin profile and call the SQL procedures through the service-role API; admins do not need a second team-platform super-admin session. The supplemental migration keeps the existing team super-admin path available.

### Central Admin Panel workflow

1. Open **People → Team Awardee Worklist** in the Top100 Admin Panel, choose the team, year, country focus, and active awardee limit per rep.
2. Review the unpaid count, then select **Shuffle unpaid from [year]**. The transaction syncs eligible records from the existing directory and assigns them to active reps in that year pool.
3. The database enforces the configured active assignment limit on year shuffles, automatic assignment, and manual reassignment. Awardees already paid, pending, or refunded are skipped.
4. When a linked award order is verified as paid, the worklist displays the payment status and the commission ledger records the applicable reward. Refunds create reversals.

## Acceptance checks

- An agent can see only their assigned awardees; staff can filter the team list by agent and assignment state.
- Each row exposes name, country, optional phone, optional email, payment state, and contact actions.
- Address appears only when present in the existing awardee metadata or a linked award order. Email and call icons use the row's available contact details.
- A paid record shows a green check only after the linked order is verified. No UI action can mark it paid.
- Selecting a year only projects existing canonical awardee records into that team's worklist; it never creates a second public awardee record.
- The year shuffle selects only unpaid records, preserves exact awardee identity, and can be repeated safely without duplicate team records or active assignments.
- Each qualifying paid order creates at most one ₦2,000 NGN commission under the current seed rules; refund creates at most one corresponding reversal.
- A late identity link cannot create a commission for an assignment made after payment.
- Year shuffle, automatic assignment, and manual reassignment never exceed the configured active limit, including concurrent admin requests.
- Agents already above capacity retain their records and are excluded from new assignment until they have room.
- Desktop table, mobile list, empty state, search, filters, and pagination remain usable.
