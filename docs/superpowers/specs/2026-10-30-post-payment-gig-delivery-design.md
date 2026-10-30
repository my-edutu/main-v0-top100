# Post-payment GIG delivery design

## Intent

After an awardee pays the physical-award fee, the next screen should move them directly into delivery setup. They must be able to choose how they will receive the award, enter or select a Nigerian destination, receive a live GIG Logistics quote, and understand that the displayed amount is the separate delivery bill. Their destination and valid quote must survive a refresh so they do not have to start again.

This work must not change the confirmed award-fee payment, claim that delivery has been paid, or book a GIG shipment before a separately verified delivery payment exists.

## Goals

- Replace the full-screen payment celebration with a calmer confirmation and an obvious delivery setup step.
- Support home delivery and GIG service-centre collection.
- Save the chosen destination and successful quote against the member's existing award order.
- Show an itemised, expiry-aware delivery bill with a clear distinction between the paid award fee and unpaid delivery.
- Preserve form values and show actionable errors when geocoding, GIG, or the network fails.
- Prepare the UI boundary for a separate Bachs delivery checkout without routing the amount through the award-fee payment flow.
- Work at narrow mobile, tablet, and desktop widths with keyboard-accessible controls.

## Non-goals

- Do not create or verify a Bachs delivery transaction in this change.
- Do not reuse the award-fee checkout or its webhook for delivery.
- Do not book a GIG shipment, create a waybill, or mark an award dispatched.
- Do not support live international quotes; the current GIG integration is Nigeria-only.
- Do not change the award-fee price, payment confirmation, or recovery rules.

## Anti-goals

- No dead “Pay now” button that appears operational before a delivery checkout exists.
- No combined “award plus delivery” total that could make an already-paid fee look payable again.
- No address preview that disappears on refresh.
- No decorative card stack or oversized celebration that pushes the delivery task below the fold.

## Current constraints

- Production has GIG and Geoapify enabled and configured.
- `POST /api/member/award/delivery-quote` verifies the award fee and returns a home-delivery quote, but currently does not persist the destination or quote.
- `GET /api/member/award/service-centres` already exposes verified GIG service centres by state and city.
- `award_orders` already contains legacy combined-checkout address, shipping and GIG fields. Its database constraints couple shipping to an award-plus-shipping total, so the post-payment flow must not reuse those money fields.
- The legacy `POST /api/member/award/quote` combines award and shipping totals and rejects paid orders; it is not suitable for the new post-payment flow.
- The existing Bachs webhook and attempt table are award-fee-specific. A future delivery checkout needs its own charge scope, reservation, settlement and reconciliation contract.

## Approaches considered

### 1. Preview-only quote

Keep the current API and only improve the form and visual hierarchy. This is smallest, but the member loses the destination and quote on refresh and the admin cannot reliably continue the delivery process. Rejected.

### 2. Reuse the legacy combined order checkout

Save the address through the older quote endpoint and reopen the combined award-plus-delivery payment flow. This conflicts with the separate award fee already paid and creates double-charge and status-regression risks. Rejected.

### 3. Saved post-payment quote with a separate future checkout

Persist the delivery destination and GIG quote on the existing award order without changing award payment or fulfilment status. Show the delivery bill and a clearly unavailable payment state until the separate Bachs delivery checkout is enabled. This is the selected approach because it completes the location-and-bill task now while preserving a safe payment boundary.

## User flow

1. The payment-return screen confirms the exact award-fee payment in a compact receipt area.
2. The same screen explains that delivery is separate and presents one primary action: set up delivery.
3. The member chooses **Home delivery** or **Collect from a GIG centre**.
4. Home delivery asks for recipient name, reachable phone, street, optional landmark, city/town, state, and optional postal code. Email is retained from the signed-in member for operations but does not need to dominate the form.
5. GIG-centre collection asks for state and city, loads verified centres, and requires one centre selection. The selected centre's verified address is visible before quoting.
6. Submission validates on both client and server. The server verifies the award fee, obtains the live quote, then performs a guarded database write that saves the destination, mode, quote payload, amount and expiry. The external carrier request cannot be part of the database transaction; the guarded write must reject an order that became ineligible while GIG was responding.
7. Success replaces the form emphasis with a delivery summary and itemised bill:
   - Award fee — Paid
   - GIG delivery — amount due
   - Delivery destination
   - Quote expiry
8. The payment area says delivery payment is not yet open. It must not resemble a clickable enabled control. The saved quote can be refreshed or the location edited.
9. A future Bachs integration will replace that unavailable state with a separate **Pay delivery** checkout and its own receipt/status lifecycle.

## Information hierarchy and visual direction

- Use the awardee dashboard's light neutral canvas, near-black text, thin borders, orange brand accent, and emerald only for confirmed success.
- Lead with “Payment confirmed” and the paid amount, then immediately show “Set up delivery.”
- Keep a simple two-column desktop layout: delivery details as the larger working panel and a sticky bill/summary panel. Collapse to one column on mobile with the bill following the fields.
- Use a segmented control for the two delivery modes, not two decorative cards.
- Use persistent field labels and specific helper/error text. The quote failure message stays near the submit action and retains all entered values.
- Avoid shadows, gradients, nested cards, and unnecessary illustrations. A small success mark is sufficient.

## Data and API contract

- Extend `POST /api/member/award/delivery-quote` to accept recipient name, phone, delivery mode and optional service-centre id in addition to address fields.
- Verify the authenticated member and a confirmed award-fee payment before contacting GIG or saving data.
- For service-centre mode, require a centre returned by the verified directory for the submitted state/city. Do not trust client-provided centre names or coordinates.
- Add a dedicated `award_delivery_quotes` table keyed to the member's award order. It stores recipient/contact/address, delivery mode, verified service-centre id when applicable, integer amount in minor units, currency, normalized destination, provider quote payload, expiry and timestamps. This avoids the legacy `award_orders` constraint and its misleading award-plus-shipping total.
- Grant members read access only to delivery quotes belonging to their own profile; all writes remain service-role only. Keep one current saved quote per active award order and retain timestamps needed for later audit/payment linkage.
- On a successful quote, perform a guarded upsert only if the authenticated member still owns the active order, the award fee remains confirmed, and the order has not been dispatched, entered transit, delivered or refunded. Do not update `award_payment_status`, payment attempts, `award_orders.status`, `paid_at`, legacy combined-total fields, or waybill fields.
- Persist a structured provider delivery object so later booking uses the exact destination priced by GIG.
- For service-centre mode, the server must re-read the selected centre from GIG's verified directory and match its id to the submitted state/city before quoting. Browser-supplied labels, addresses and coordinates are never authoritative.
- Return a normalized saved-delivery view containing amount, currency, mode, formatted destination and expiry.
- Add a read path for the member's current saved delivery setup so refresh restores the form/summary. This may be included in the existing award payment response or exposed as a focused authenticated delivery endpoint; prefer the focused endpoint to keep payment truth isolated.
- Treat expired quotes as saved destinations that need re-quoting, not as lost data.
- Failed quotes retain the client form and do not replace the last valid saved quote unless the member successfully obtains a new one.

## State model

- **No destination:** show delivery form.
- **Loading centres:** disable centre selection and show inline progress.
- **Directory unavailable:** offer retry and home delivery; do not fabricate centres.
- **Quoting:** prevent duplicate submissions and retain values.
- **Quote failed:** show a specific safe message and retain values.
- **Saved valid quote:** show bill, destination, expiry, edit and refresh actions.
- **Saved expired quote:** show destination plus “Quote expired,” with re-quote as the primary action.
- **Payment unavailable:** explain that online delivery payment will open soon; no enabled checkout control.
- **Future payment pending/paid:** reserved for the later Bachs delivery-payment project.

## Security and integrity

- All quote, centre and saved-delivery endpoints remain authenticated and rate-limited.
- Server-owned GIG amounts and destination coordinates are authoritative; never accept an amount or coordinate from the browser.
- Conditional database updates prevent overwriting a concurrently dispatched or delivered order.
- Logs and responses must not expose provider credentials or raw sensitive payloads.
- Address data is personal data: only the member and service role may read it under existing RLS/service boundaries.

## Verification

- Add route tests for home and service-centre validation, confirmed-payment enforcement, successful persistence, failed-quote non-overwrite, expired quote handling, and concurrent status protection.
- Add component tests for both modes, centre loading/failure, retained values after quote failure, saved quote, and expired quote.
- Run focused award/GIG tests, TypeScript, and relevant linting.
- Inspect the rendered flow at approximately 360 px, 768 px and 1280 px. Verify long addresses, long centre names, missing phone, keyboard focus, loading, error, valid quote and expired quote.
- Do not create a real shipment or charge a real payment during verification.

## Future Bachs delivery payment

The later payment project must add a distinct delivery charge scope and purpose, immutable quote amount/reference, dedicated reservation and reconciliation logic, webhook settlement that cannot mark the award fee paid, and idempotent GIG booking only after verified delivery payment. The UI in this design deliberately exposes a clean integration point without pretending that lifecycle exists today.
