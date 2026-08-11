# GIG Logistics Live Quote Rollout

**Date:** 2026-08-11
**Status:** Approved design, awaiting GIG Logistics API access

## Context

Top100AFL already has the customer-facing and server-side foundation for award delivery:

- Members enter delivery details in the Awards section of the dashboard.
- `POST /api/member/award/quote` validates the address and requests a courier quote server-side.
- The member sees an itemised award price, delivery price, and total before payment.
- Paystack is initialised from the stored server-side total, not an amount supplied by the browser.
- Paid orders can be booked with a courier, assigned a waybill, and tracked from the dashboard.
- `lib/courier/gig.ts` isolates GIG Logistics' HTTP contract behind the carrier-neutral
  `CourierAdapter` interface.
- `GIG_ENABLED` is an explicit activation lock. Without verified credentials and that flag, the
  system uses manual quotation and never invents a delivery price.

GIG Logistics' current developer page confirms that the company provides APIs for shipment
automation, delivery features, and real-time tracking, but directs businesses to contact GIGL for
the integration details rather than publishing the full authenticated contract:
<https://giglogistics.com/developer/>.

GIGL's public calculator confirms that domestic pricing depends on origin, destination, quantity,
weight, and declared item value: <https://giglogistics.com/shipping-price-calculator/>. On
2026-08-11, its public portal returned a `DeliveryPrice` and `GrandTotal` of NGN 10,199 for a
one-kilogram regular parcel valued at NGN 20,000 from station 4 (Lagos) to station 3 (Federal
Capital Territory). This observation is useful for verification only; the undocumented public
calculator endpoint is not the production integration contract.

The product owner has requested official API access from GIGL. Automatic GIG quoting remains off
until GIGL responds.

## Goals

1. Let a member enter one delivery address and obtain a trustworthy shipping price with one click.
2. Optimise the first live release for awards dispatched from a fixed Lagos pickup point to
   destinations within Nigeria.
3. Accept international delivery addresses from launch without pretending an unverified automatic
   international quote is available.
4. Show the award price, GIGL delivery charge, and combined total before the member starts payment.
5. Preserve automatic booking and tracking after payment where the verified GIG API supports them.
6. Fail safely: no guessed, stale, malformed, or client-supplied delivery amount may be charged.

## Non-goals

- Scraping or depending on GIGL's public website calculator in production.
- Activating GIG with reconstructed or unverified credentials, endpoints, fields, station IDs, or
  money units.
- Blocking international members from submitting an address merely because automated
  international pricing is not yet verified.
- Rebuilding the existing award, Paystack, admin, email, or tracking systems.
- Adding another courier in this rollout.

## Recommended rollout

### Phase 0 — Safe waiting state

Keep `GIG_ENABLED` unset or false. Continue accepting delivery details through the existing Awards
section. When automatic pricing is unavailable, save the address, mark the order for manual
quotation, and tell the member that the team will contact them with the delivery cost.

No UI should promise an instant GIG price while the official contract is pending.

### Phase 1 — Lagos-origin domestic quotes

After GIGL provides business credentials and documentation:

1. Configure a single verified Lagos pickup address, station, contact, coordinates when required,
   and the real packaged award dimensions, weight, quantity, and declared value.
2. Validate login, quote, booking, and tracking in a non-production account or with test shipments.
3. Compare live API quotes with GIGL's own calculator or dashboard for a controlled route matrix.
4. Pin the exact response fields, currency, and units instead of leaving ambiguous fallback fields.
5. Enable `GIG_ENABLED` in staging, complete end-to-end testing, and only then enable it in
   production.

For a Nigerian destination, the member enters the address and presses **Calculate delivery**. The
server requests a GIG quote and returns the itemised total. Lagos is the origin, not a customer
choice.

### Phase 2 — International automation

International addresses remain valid throughout Phase 1. They follow the manual-quotation path and
display a clear pending message instead of a zero or guessed delivery charge.

When GIGL supplies a documented international quotation and booking contract, extend the GIG
adapter behind the existing carrier interface. The member form, order model, total panel, payment
flow, and tracking UI should not need to change. International payment must remain unavailable until
a server-stored quote has been supplied either by the verified API or an authorised administrator.

## Member experience

### Delivery form

- Prefill name and email from the member profile.
- Collect recipient name, phone, email, street address, optional second line, city, state or region,
  country, and optional postal code.
- Use a canonical country selector backed by ISO country codes, defaulted to Nigeria. Validate a
  Nigerian state for domestic addresses; retain free-text state or region for other countries.
- Label the primary action **Calculate delivery** so its result is explicit.
- While quoting, disable repeat submission and show **Calculating delivery…**.

### Successful domestic quote

Show a review step before Paystack:

```text
Africa Future Leaders Award       NGN 20,000
Delivery — GIG Logistics          NGN  x,xxx
---------------------------------------------
Total                             NGN xx,xxx
```

Also show the destination summary, an **Edit address** action, the quote expiry whenever the stored
quote has one, and a single **Pay NGN xx,xxx** action.

### International address before Phase 2

Save the address and show:

> International delivery quote pending. Our team will confirm the delivery cost before you pay.

Do not show a zero delivery charge or an enabled payment action. The admin awards queue must make
these orders easy to distinguish and price.

During the manual international phase, the administrator enters the customer-facing delivery price
in NGN/kobo. The award and delivery remain one NGN Paystack transaction; the browser does not
perform currency conversion.

### Quote failure

If GIGL times out, rejects the route, returns a non-success response, names a different currency, or
returns a missing, zero, negative, non-finite, or otherwise unreadable amount:

- persist the address;
- set the order to the existing `quote_failed` recovery state;
- store safe diagnostic data without credentials or tokens;
- show a member-safe manual-follow-up message; and
- provide the admin team with a visible recovery action.

## Architecture and data flow

```text
Member Awards form
        |
        v
POST /api/member/award/quote
  - authenticate member
  - validate address
  - classify domestic/international
        |
        +-- Nigeria ------> verified GIG adapter ------> live quote
        |
        +-- International -> manual quote initially ---> admin queue
        |
        v
award_orders: address + server-stored quote + expiry + total
        |
        v
Review total -> Paystack -> verified webhook -> GIG booking -> waybill/tracking
```

The browser never calls GIGL directly. API credentials, tokens, sender details, field mappings, and
raw carrier responses remain server-side. The browser never supplies or recalculates the amount
Paystack charges.

### Courier routing

The courier boundary remains carrier-neutral. Routing adds destination awareness without leaking
GIG-specific wire fields into the award route:

- Nigerian address plus verified enabled configuration: use the GIG domestic quote path.
- International address before the verified international contract: return a structured manual
  quotation result.
- Missing, disabled, or unhealthy GIG configuration: use the existing safe manual fallback.

The routing decision should be deterministic and directly tested.

### Quote persistence and expiry

Successful quotes store:

- integer shipping amount in kobo;
- ISO currency, expected to be `NGN` for the domestic rollout;
- itemised total in kobo;
- safe carrier response or reference needed for audit;
- creation and expiry timestamps; and
- the exact delivery and package inputs used for the quote.

Checkout rejects a missing, failed, expired, differently denominated, or internally inconsistent
quote. If a member edits the address, the old quote and total are invalidated and a new quote is
required.

## Official API verification gate

The following must be confirmed from GIGL documentation and live test calls before setting
`GIG_ENABLED=true`:

1. Production and test base URLs.
2. Authentication request, token field, expiry, refresh behaviour, and account identifiers.
3. Quote, address/station lookup, booking, and tracking paths and HTTP methods.
4. The exact request body for Lagos-origin domestic shipments.
5. The correct Lagos sender station, pickup details, coordinates, and shipment mode.
6. Packaged award quantity, dimensions, actual/billable weight, item type, and declared value.
7. The authoritative total field and whether it includes VAT, insurance, pickup, discounts, and
   other surcharges.
8. Currency and whether amounts are expressed in naira or kobo.
9. Quote lifetime and whether booking must reference the original quote.
10. Idempotency or duplicate-prevention behaviour for shipment booking.
11. Waybill and customer-facing tracking URL fields.
12. Carrier status vocabulary and its mapping to `dispatched`, `in_transit`, and `delivered`.
13. Supported international origin/destination pairs, currencies, customs inputs, prohibited-item
    rules, duties, insurance, and booking workflow.

Activation requires recorded evidence for each applicable domestic item, not merely successful
authentication.

## Verification route matrix

Before production activation, compare the API result with GIGL's calculator or business dashboard
using the same packaged award inputs:

| Route | Purpose |
| --- | --- |
| Lagos to Lagos | Same-state baseline |
| Lagos to Federal Capital Territory | Priority interstate control case |
| Lagos to Ogun | Nearby interstate boundary |
| Lagos to Rivers | Longer southern route |
| Lagos to Kano | Longer northern route |
| Unsupported or malformed Nigerian address | Safe failure behaviour |
| International address | Manual fallback before Phase 2 |

For each successful route, record the API amount, comparison amount, currency, units, timestamp,
and any surcharge breakdown. Material discrepancies block activation until GIGL explains them.

## Error handling and operational safety

- Rate-limit quote requests per authenticated member.
- Apply timeouts and bounded retries only to safe, idempotent operations.
- Never automatically retry shipment booking when a timeout could have occurred after creation.
- Cache authentication tokens server-side and refresh them without logging credentials or tokens.
- Redact secrets and unnecessary personal data from logs.
- Treat an unknown tracking status as no state change.
- Keep the manual fallback available as a kill switch that requires no data migration.
- Surface `quote_failed`, paid-but-unbooked, international-manual, and unknown-tracking orders in the
  admin queue.

## Testing

### Automated tests

- Domestic/international address classification.
- Successful GIG quote mapped to integer kobo and an itemised total.
- Naira-to-kobo conversion and rounding boundaries, if the confirmed API uses naira.
- Missing, zero, negative, non-finite, non-NGN, and ambiguous amounts are rejected.
- Timeouts, network failures, non-success responses, and exhausted authentication retries fall back
  safely.
- Authentication caching and one re-authentication after an unauthorised response.
- Quote expiry and invalidation after address edits.
- Checkout uses only the stored valid server total.
- Booking returns a waybill and is not automatically duplicated.
- Known tracking statuses advance monotonically; unknown statuses make no change.
- International addresses enter manual quotation before Phase 2.
- Member and admin messages correctly distinguish automatic failure from international manual
  review.

### Staging acceptance

1. Complete the domestic verification matrix.
2. Run one controlled payment and test booking.
3. Confirm exactly one shipment appears in the GIGL account.
4. Track the shipment through every available status and reconcile the mapping.
5. Exercise the kill switch and confirm new orders immediately return to manual pricing.
6. Submit an international address and confirm payment remains unavailable until an authorised
   quote is stored.

## Rollout and rollback

1. Obtain official GIGL API access and documentation.
2. Configure credentials and verified sender/package values in staging.
3. Complete the API gate, automated tests, and staging acceptance.
4. Enable domestic quoting for internal or selected test members.
5. Monitor quote failure rate, amount discrepancies, booking failures, duplicate reports, and
   tracking status coverage.
6. Enable domestic quoting for all eligible members.
7. Treat international automation as a separate activation after its contract is verified.

Rollback is immediate: set `GIG_ENABLED=false`. Existing paid and dispatched orders retain their
stored payment, waybill, and tracking data; new or edited orders use manual quotation.

## Success criteria

- A member receiving an award dispatched from the fixed Lagos origin to a supported Nigerian
  destination can enter one address, click once, and see a verified delivery charge and total
  before payment.
- No customer can pay a delivery amount obtained from an unverified, expired, malformed, or
  browser-supplied quote.
- International members can submit an address and receive a clear manual-quotation path before
  Phase 2.
- A paid domestic order is booked at most once and exposes its waybill and tracking state.
- Operations can disable automatic GIG pricing without a deploy or migration.
