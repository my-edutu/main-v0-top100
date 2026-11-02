# Award outreach operations

The awards console now has a separate **Member outreach** workspace. Order totals count orders; the new cohort cards count deduplicated eligible awardees. Select 2026, another recorded year, or all cohorts from 2023 onward.

## Before first use

1. Deploy `supabase/migrations/20261102113950_award_outreach_workspace.sql` with the application. No production migration or campaign is run by the implementation tests.
2. Configure the existing `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY`, verified sender settings, and the canonical public site URL. The outreach worker requires SMTP explicitly.
3. Configure `AWARD_OUTREACH_WORKER_SECRET`, or reuse `EMAIL_OUTBOX_WORKER_SECRET`. Schedule a server-side POST to `/api/internal/award-outreach/process`, with `Authorization: Bearer <secret>`, every minute. Keep the secret server-side; never include it in a browser URL. Each invocation processes at most three recipients and supports overlapping invocations safely.
4. Confirm support ownership, real fulfillment arrangements and recipient permission before approving a batch. The initial templates deliberately do not promise a delivery date, discount or deadline.

## Audiences and payment truth

- **Unpaid:** no verified award-fee payment, including cases still needing verification. This is not proof of debt. Physical award purchase is optional and does not determine recognition.
- **Unfinished orders:** at least one order and no verified payment or unresolved success/processing evidence.
- **Verify payment first:** possible success, payment processing, a paid flag without evidence, or a member who reports already paying. Payment-request templates exclude this group.
- **No award order:** eligible awardee without an order.
- **No profile:** eligible unpaid awardee without a linked/matched account. Their action link goes to the existing profile claim flow, which still requires the team's AFL invite code. Contact support if a code is unavailable; no code is generated or exposed by a campaign.
- **Confirmed paid:** canonical successful Bachs award-fee evidence or successful, timestamped legacy Paystack evidence. A successful delivery payment cannot replace an award-fee payment.

Directory identities are joined by explicit profile links and normalized email, and successful payments on older orders suppress new payment requests. Missing payment data makes the audience unavailable rather than marking everybody unpaid. Reads paginate beyond the default 1,000-row response cap.

## Link visits and exports

Historic individual clicks are unknown. The existing aggregate analytics cannot reconstruct them. New campaign emails and CSV exports contain opaque per-contact tracked links. Copying email addresses alone does not start tracking. **No recorded link visit** means a link has been prepared/issued and no visit has been recorded. It does not prove that an email was delivered or that a person ignored it. Security scanners may produce visits.

SMTP mail-merge CSV includes normalized email, identity/cohort/contact fields, personalized subject, text, HTML, action link and stop-outreach link. Values are quoted and formula-triggering spreadsheet cells are escaped. Copy emails returns unique eligible addresses for the selected template and pilot size. Exporting does not send or stamp a contact as contacted. After external SMTP sends, update the person's contact date so they are excluded from overlapping outreach.

## Recommended pilot

Start with 50 recovery contacts and 100 awareness contacts. Speak with 10 from each group and capture the main obstacle, owner, notes and next follow-up date. Use the day-four helpful follow-up and day-eight final check-in as reviewed batches, not an automatic sequence. Confirmed payers, suppressed people, verification cases and contacts from the last three days are excluded from payment-request campaigns. New batches prioritise people without a recorded contact date.

The worker sets a next follow-up date when a message is attempted. The **Follow-up due** group is a staff worklist; it does not automatically send. Coordinate with the existing transactional payment-reminder schedule before starting outreach. The stop-outreach link suppresses optional outreach; it does not disable essential account or transaction receipts.

## Delivery and outcomes

Queuing snapshots the reviewed template and server-derived recipients. Workers recheck eligibility immediately before sending. Cancelling stops pending recipients; a send already in progress may complete. The campaign/request identity prevents duplicate creation after a network retry. Only one recipient with a given email can be processing across all campaigns.

**Accepted** means SMTP accepted the message, not inbox placement. **Delivery uncertain** means the worker or provider could not prove the outcome; it is never automatically retried. Emails with an uncertain result are held out of subsequent queued sends and exports until delivery is reviewed. In **Email delivery awaiting verification**, check the SMTP provider's logs, record the evidence/reference, and save whether the provider accepted or rejected the original message. This clears the reviewed hold without sending an email. Explicit SMTP rejections are marked failed, not uncertain. Preparation failures also require a deliberate new reviewed batch; no automatic retries are performed.

**Paid after send** compares sent campaign members with their current verified payment state. It is observational and must not be interpreted as causal attribution. Review confirmed payments per recipient, replies and declining reasons separately for awareness and recovery.

No new discounts, sponsored awards or split-payment contracts are introduced. Recorded affordability/timing reasons help staff decide whether a separately approved offer change is needed.

## Verification record

The new audience/guard/worker/template/SMTP tests and isolated PostgreSQL queue tests pass. An actual read-only source load succeeds against the connected directory; production schema and email data were not modified. Component layout and the notes dialog were checked using synthetic fixtures at phone and desktop widths. The Next.js development bundler failed during local verification, so the same components were bundled independently for visual inspection; this does not verify live SMTP delivery.

The fresh pre-merge full-suite run passed: 295 test files, 1,819 tests; 24 database tests were skipped by their opt-in guards. The four outreach PostgreSQL tests were also run separately and passed. Typecheck, scoped ESLint and the staged diff check passed. Earlier resource-constrained image/bulk-update timeouts did not recur in this full run. No production campaign or payment was performed during verification.
