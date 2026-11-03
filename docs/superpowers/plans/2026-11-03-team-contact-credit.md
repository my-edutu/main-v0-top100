# Contact-based team payment credit

**Goal:** Credit a verified award payment only when its assigned rep recorded qualifying outreach before payment, release independent payers from rep worklists, and show clear naira-only team cards.

**Architecture:** A canonical SQL evidence helper and service-only attribution view govern commission creation and read models. Existing payment currencies remain intact. Cards show standard NGN award value, not an invented FX conversion. Reversals preserve ledger history and already settled withdrawals.

**Decisions:** Assignment alone is insufficient. Provider-accepted email records qualify; logged call/WhatsApp outcomes require substantive notes and must have been recorded before payment. A link opening, failed send, or after-payment backdated record does not qualify. Manual telephone/WhatsApp logs are staff records, not independent provider evidence. Use the existing stack, access controls and Top100 visual style. No new communication provider integration or automatic campaign is introduced.

- [ ] Add failing SQL tests for no outreach, valid/invalid contacts, wrong rep/team, after-payment backdating, reassignment boundaries, repeated reconciliation, historical reversals and worklist release.
- [ ] Add additive migration: evidence helper/view, guarded earning path, idempotent historical correction, release independent paid assignments. Keep service-only RPC permissions and immutable payment records.
- [ ] Add failing main-app tests for assignment-only credit, evidence ownership, conflicting projections and normalized naira award value. Load canonical attribution rows with pagination and fail visibly if evidence is unavailable.
- [ ] Improve card hierarchy, density, responsive identity wrapping, loading/error states, naira-only value and accessible access management.
- [ ] Run main and team typechecks/tests, isolated PostgreSQL tests, review the integration and inspect narrow/wide rendered cards.
- [ ] Apply the reviewed migration on self-hosted Top100 with protected backup, publish code and verify live worker/app state within user-authorized scope. No real outreach or withdrawal is performed for verification.

**Review focus:** Prevent after-payment backdating; keep currencies and award value distinct; reject duplicate/cross-team ownership; preserve reversal/withdrawal accounting; keep noncredited paid users visible to administrators while removing rep access.
