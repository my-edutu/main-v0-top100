# GIG Logistics ("Agility" third-party API) integration

Implemented in `lib/courier/gig.ts` + `lib/courier/http.ts`. Selected automatically by
`getCourier()` in `lib/courier/index.ts` once `GIG_API_BASE_URL`, `GIG_API_USERNAME` and
`GIG_API_PASSWORD` are all set. Unset `GIG_API_BASE_URL` to fall back to `lib/courier/manual.ts`
(admin prices and dispatches by hand).

---

## ⚠️ Status: UNVERIFIED against a live account

There are **no GIG credentials in this environment**, so no line of this adapter has ever been run
against the real API. The request/response shape below is reconstructed from two independent public
clients (citations at the bottom), not from vendor documentation we could read. Treat every field
name as a hypothesis.

That is why **every endpoint path and every response field name is an environment variable with the
documented value as its default**, and why request bodies can be extended or overridden with
`GIG_*_EXTRA_JSON`. If the first real call disagrees with these defaults, the fix is a config
change, not a code change or a deploy.

The one behaviour that is *not* configurable is the safety rule: the adapter **never invents a
shipping price**. A missing, unparseable, non-2xx, timed-out, zero, negative or non-naira amount
returns `{ ok: false }`, which parks the order at `quote_failed` for manual pricing.

---

## Assumed wire format

Base URL is expected to include the `/api/thirdparty` prefix, e.g.
`https://mobile.gigl-go.com/api/thirdparty` (live) — the paths below are appended to it.

### 1. Login — `POST {base}/login`

```jsonc
// request
{ "username": "<GIG_API_USERNAME>", "Password": "<GIG_API_PASSWORD>", "SessionObj": "" }

// response
{ "Object": { "access_token": "…", "UserId": "…", "UserName": "CUST001" } }
```

The casing (`username` lowercase, `Password` capitalised) matches the reference client and is
deliberate. The token is sent as `Authorization: Bearer <token>` on every other call, is cached in
module scope, and is refreshed `GIG_TOKEN_SKEW_MS` (60s) before expiry. A `401` on any call triggers
**exactly one** re-login and one replay, then gives up. **The password and the token are never
logged, and never appear in the `raw` payload returned to callers.**

> The plan document assumed `POST /Admin/login`. The clients cited below use `login` relative to the
> `/api/thirdparty` base, so that is the default. Set `GIG_PATH_LOGIN=Admin/login` if the account's
> docs say otherwise.

### 2. Geocode (optional pre-step) — `POST {base}/getaddressdetails`

```jsonc
{ "Address": "12 Adeola Odeku Street, Victoria Island, Lagos, Nigeria" }
// -> { "Object": { "Latitude": "6.4281", "Longitude": "3.4219" } }
```

The reference client resolves the receiver's coordinates before pricing because the price endpoint
expects `ReceiverLocation`. Enabled by default (`GIG_GEOCODE_ENABLED=1`). If it fails, the adapter
prices **without** coordinates rather than failing outright — the worst case is a declined quote,
never a wrong one.

### 3. Quote — `POST {base}/price`

```jsonc
{
  "ReceiverName": "…", "ReceiverPhoneNumber": "…", "ReceiverAddress": "…",
  "ReceiverStateName": "Lagos", "ReceiverLocality": "Victoria Island",
  "ReceiverLocation": { "Latitude": "…", "Longitude": "…" },   // omitted when geocoding is off/failed
  "SenderName": "…", "SenderPhoneNumber": "…", "SenderAddress": "…", "SenderLocality": "…",
  "SenderLocation": { "Latitude": "…", "Longitude": "…" },     // only when GIG_SENDER_LAT/LNG are set
  "VehicleType": "BIKE",
  "SenderStationId": "4", "ReceiverStationId": "4",
  "UserId": "…", "CustomerCode": "…",                          // echoed from the login response
  "PreShipmentItems": [
    { "SpecialPackageId": "0", "Quantity": 1, "Weight": "1", "ItemType": "Normal",
      "WeightRange": "0", "ItemName": "Award plaque", "Value": "0", "ShipmentType": "Regular" }
  ]
}
```

Response amount is read from the first path that yields a usable number in
`GIG_FIELD_QUOTE_AMOUNT` (default `Object.GrandTotal,Object.DeliveryPrice,Object.Total`). **The two
cited clients disagree on this field** — one reads `Object.DeliveryPrice`, the other
`Object.GrandTotal` — which is exactly why the list exists. The path that matched is logged on
failure.

Amounts are assumed to be **naira** and are converted with `Math.round(naira * 100)`. If the
response names a currency (`GIG_FIELD_QUOTE_CURRENCY`) and it is not `NGN`, the adapter declines
rather than converting at a rate it does not have.

### 4. Book — `POST {base}/captureshipment`

Same body as the quote, plus `ReceiverEmail` and `CustomerReference` (the award order id).
Response waybill is read from `GIG_FIELD_WAYBILL`
(default `Object.waybill,Object.Waybill,Object.WaybillNumber,waybill`).

**Booking is never retried** — not on 5xx, not on a network error, not on a timeout. A retried
booking creates a second parcel the member has not paid for. The only replay is the single 401
re-login, which is safe because a 401 means the carrier rejected the request before creating
anything.

A 2xx that carries no waybill **throws**. A shipment we cannot identify is worse than a visible
failure: throwing leaves the order in the "paid but not dispatched" recovery queue on
`/admin/awards`, which an admin can resolve.

### 5. Track — `GET {base}/TrackAllShipment/{waybill}`

```jsonc
{ "Object": { "Origin": "…", "Destination": "…",
              "MobileShipmentTrackings": [ { "Status": "ENDED", "Waybill": "…" } ] } }
```

Every event's `Status` (plus an optional top-level status field) is mapped through an explicit,
case-insensitive table, and the **furthest-along recognised** status wins — event ordering in the
array is unverified and a shipment's journey is monotonic. Anything unrecognised maps to
`'unknown'`, which `app/api/member/award/track/route.ts` reads as "write nothing".

| Carrier status text                                                                                              | App status    |
| ---------------------------------------------------------------------------------------------------------------- | ------------- |
| `UNASSIGNED`, `UPCOMING`, `ACCEPTED`, `ASSIGNED`, `PROCESSING`, `SHIPMENT CREATED`, `SHIPMENT SCHEDULED`           | `dispatched`  |
| `STARTED`, `MCRT`, `ARRIVED`, `IN TRANSIT`, `INTRANSIT`, `OUT FOR DELIVERY`, `SHIPMENT DEPARTED`, `SHIPMENT ARRIVED FINAL DESTINATION` | `in_transit`  |
| `ENDED`, `DELIVERED`, `COMPLETED`, `SHIPMENT RECEIVED BY CUSTOMER`                                                | `delivered`   |
| `FAILED`, `DECLINE`, `CANCEL`, `DELETED`, anything else                                                            | `unknown`     |

Unhappy terminal states are deliberately absent from the table: they are not one of the app's three
forward statuses and must not be guessed into one. Extend or correct the table from env with
`GIG_STATUS_MAP_JSON`, e.g. `{"PARCEL HANDED OVER":"delivered"}`.

---

## Environment variables

### Required to activate the adapter

| Var | Default | Notes |
| --- | --- | --- |
| `GIG_API_BASE_URL` | — | e.g. `https://mobile.gigl-go.com/api/thirdparty`. **Unset this to fall back to manual pricing.** |
| `GIG_API_USERNAME` | — | |
| `GIG_API_PASSWORD` | — | Never logged. |

### Transport

| Var | Default | Notes |
| --- | --- | --- |
| `GIG_TIMEOUT_MS` | `12000` | Applied to every call via `AbortSignal.timeout`. |
| `GIG_RETRIES` | `2` | Extra attempts for **idempotent** calls only (login, geocode, quote, track). Booking is hard-coded to 0. |
| `GIG_RETRY_BASE_MS` | `300` | Exponential backoff base. |
| `GIG_TOKEN_TTL_MS` | `300000` | Used only when the login response carries no expiry. |
| `GIG_TOKEN_SKEW_MS` | `60000` | Refresh this far ahead of expiry. |

### Endpoint paths (relative to the base URL)

| Var | Default |
| --- | --- |
| `GIG_PATH_LOGIN` | `login` |
| `GIG_PATH_QUOTE` | `price` |
| `GIG_PATH_BOOK` | `captureshipment` |
| `GIG_PATH_TRACK` | `TrackAllShipment/{waybill}` (`{waybill}` is URL-encoded in) |
| `GIG_PATH_GEOCODE` | `getaddressdetails` |

### Response field names (comma-separated dotted paths; first match wins)

| Var | Default |
| --- | --- |
| `GIG_FIELD_TOKEN` | `Object.access_token,access_token,Object.Token,token` |
| `GIG_FIELD_TOKEN_EXPIRY` | `Object.expires_in,expires_in,Object.ExpiresIn` (seconds) |
| `GIG_FIELD_USER_ID` | `Object.UserId,Object.userId` |
| `GIG_FIELD_CUSTOMER_CODE` | `Object.UserName,Object.CustomerCode` |
| `GIG_FIELD_QUOTE_AMOUNT` | `Object.GrandTotal,Object.DeliveryPrice,Object.Total` |
| `GIG_FIELD_QUOTE_CURRENCY` | `Object.CurrencyCode,CurrencyCode,Object.Currency` |
| `GIG_FIELD_WAYBILL` | `Object.waybill,Object.Waybill,Object.WaybillNumber,waybill` |
| `GIG_FIELD_TRACKING_URL` | `Object.TrackingUrl,Object.trackingUrl,TrackingUrl` |
| `GIG_FIELD_TRACK_EVENTS` | `Object.MobileShipmentTrackings` (an array) |
| `GIG_FIELD_TRACK_EVENT_STATUS` | `Status` (read on each array element) |
| `GIG_FIELD_TRACK_STATUS` | `Object.ShipmentStatus,Object.Status,ShipmentStatus` |
| `GIG_FIELD_GEOCODE_LATITUDE` | `Object.Latitude,Latitude` |
| `GIG_FIELD_GEOCODE_LONGITUDE` | `Object.Longitude,Longitude` |

### Request content

| Var | Default | Notes |
| --- | --- | --- |
| `GIG_SENDER_NAME` / `GIG_SENDER_PHONE` / `GIG_SENDER_ADDRESS` / `GIG_SENDER_CITY` | empty | **Set these before going live** — the pickup address. |
| `GIG_SENDER_LATITUDE` / `GIG_SENDER_LONGITUDE` | empty | `SenderLocation` is omitted unless both are set. |
| `GIG_SENDER_STATION_ID` / `GIG_RECEIVER_STATION_ID` | `4` | Station ids from the GIG account. `4` is the reference client's placeholder — **confirm yours.** |
| `GIG_VEHICLE_TYPE` | `BIKE` | |
| `GIG_ITEM_NAME` / `GIG_ITEM_WEIGHT_KG` / `GIG_ITEM_QUANTITY` / `GIG_ITEM_TYPE` / `GIG_ITEM_VALUE_NAIRA` / `GIG_SHIPMENT_TYPE` | `Award plaque` / `1` / `1` / `Normal` / `0` / `Regular` | The single parcel line item. |
| `GIG_GEOCODE_ENABLED` | `1` | Set `0` to skip the coordinate lookup. |
| `GIG_EXPECTED_CURRENCY` | `NGN` | A different quoted currency is declined, never converted. |
| `GIG_TRACKING_URL_TEMPLATE` | empty | e.g. `https://giglogistics.com/track/{waybill}`. Empty ⇒ `trackingUrl: null`. A guessed link that 404s is worse than none. |
| `GIG_STATUS_MAP_JSON` | `{}` | Merged over the status table; values must be `dispatched`/`in_transit`/`delivered`/`unknown`. |
| `GIG_LOGIN_EXTRA_JSON` / `GIG_QUOTE_EXTRA_JSON` / `GIG_BOOK_EXTRA_JSON` / `GIG_GEOCODE_EXTRA_JSON` | `{}` | Merged **last** into the request body, so any request field this adapter gets wrong can be added or overridden without a code change. Malformed JSON is logged and ignored. |

---

## First-real-call verification checklist

Do this on a staging/test GIG account, in order. Nothing below has been done yet.

1. **Login.** Confirm `POST {base}/login` returns 200 and that the token really is at
   `Object.access_token`. Note whether the response carries an expiry; if it does, set
   `GIG_FIELD_TOKEN_EXPIRY` to its actual path, otherwise tune `GIG_TOKEN_TTL_MS` to the documented
   session length. Confirm `Object.UserId` / `Object.UserName` exist — if not, GIG may reject
   priced requests for a missing `CustomerCode`.
2. **Quote, Lagos → Abuja.** Call `quote()` with a real Lagos pickup (`GIG_SENDER_*`) and an Abuja
   delivery address. Then:
   - Confirm the request was accepted at all (station ids, `VehicleType`, `PreShipmentItems`).
     Note that `BIKE` is intra-city; an inter-state route likely needs a different `GIG_VEHICLE_TYPE`.
   - **Confirm which field holds the amount** and pin `GIG_FIELD_QUOTE_AMOUNT` to exactly that one
     path. Do not leave the fallback list in place once you know: `GrandTotal` and `DeliveryPrice`
     may differ (VAT, insurance, handling), and the member is charged this number.
   - **Confirm the amount is naira, not kobo.** If GIG already returns kobo, this adapter would
     multiply by 100 — a 100× overcharge. Compare the quoted figure against the GIG website's price
     calculator for the same route before enabling it for members.
   - Confirm the currency field name and value.
3. **Geocode.** Check whether the price call succeeds without `ReceiverLocation`. If it does, set
   `GIG_GEOCODE_ENABLED=0` and save a round trip per quote.
4. **Book once, on a test account.** Confirm the waybill path, then pin `GIG_FIELD_WAYBILL`.
   Confirm the shipment appears exactly once in the GIG dashboard.
5. **Track that waybill.** Record the exact status strings GIG returns over the shipment's life and
   reconcile them with the table above via `GIG_STATUS_MAP_JSON`. Anything unmapped silently means
   "no update", so an order can sit at `dispatched` forever if the vocabulary differs.
6. **Tracking URL.** Get the real customer-facing tracking URL format from GIG and set
   `GIG_TRACKING_URL_TEMPLATE`.

Until step 2 is complete, prefer leaving `GIG_API_BASE_URL` unset. Manual pricing is slower but
cannot overcharge anyone.

## Rollback

Unset `GIG_API_BASE_URL` (or any one of the three credentials). `getCourier()` immediately returns
`manualCourier`, which declines to quote and routes every order to `quote_failed` for the admin
team. No data migration, no deploy of code changes.

---

## Citations

The wire format above is reconstructed from these public clients, accessed 2026-07-27. GIG's own
developer portal (<https://giglogistics.com/developer/>) returns 403 to non-browser clients and its
linked API reference host (`test.giglogisticsse.com`) no longer resolves, so no vendor-authored
document was readable.

1. **GIG Logistics' WooCommerce plugin** — the primary source, and the closest thing to a
   first-party client. Establishes the base URLs (`https://mobile.gigl-go.com/api/thirdparty/`
   live, `http://test.giglogisticsse.com/api/thirdparty/` test), the `login` / `price` /
   `captureshipment` / `TrackAllShipment/{waybill}` / `getaddressdetails` paths, the login body and
   `Object.access_token` / `Object.UserId` / `Object.UserName` response, the `Bearer` header, the
   price/shipment request body, `Object.waybill`, `Object.MobileShipmentTrackings[].Status`, and
   the job-status vocabulary (`UPCOMING`, `STARTED`, `ENDED`, `FAILED`, `ARRIVED`, `UNASSIGNED`,
   `ACCEPTED`, `DECLINE`, `CANCEL`, `DELETED`, `MCRT`).
   <https://github.com/gcascbt/Gigl-Devilery-Plugin/blob/61017cd9f5363407ccb7dca27191fbc7a521c43f/gigl-delivery/inc/BaseHandlerLocateFiles/WC_Gigl_Delivery_API.php>
   and `.../inc/BaseHandlerLocateFiles/WC_Gigl_Delivery_Shipping_Method.php` (reads the quote from
   `Object.DeliveryPrice`) and `.../inc/PagesHandlerLocateFiles/WC_Gigl_Delivery.php` (reads the
   waybill from `Object.waybill`).
   Plugin listing that points at the API reference:
   <https://chooseplugin.com/plugin-info/gigl-delivery/>
2. **A second, independent TypeScript client** (2026) — corroborates `POST .../api/thirdparty/price`
   with `ReceiverAddress` / `ReceiverStateName` / `ReceiverLocality` / `VehicleType`, reads the
   amount from `Object.GrandTotal`, and confirms naira→minor-unit conversion with `* 100`.
   <https://github.com/artpromedia/epplaa/blob/a7dc8072e45199598683c8c7cacb11281b035ade/services/api-monolith/src/lib/fulfillment/gig.ts>

Where (1) and (2) conflict — the quote amount field — both are tried in order and the checklist
above requires pinning the correct one before go-live.

## What is still unverified

Everything that a live call would settle, specifically: the production base URL, whether the login
path is `login` or `Admin/login`, the token's real lifetime and expiry field, the correct station
ids and `VehicleType` for an inter-state award shipment, whether `ReceiverLocation` is mandatory,
**which field carries the shipping amount and whether it is naira or kobo**, the exact waybill field
name, the customer-facing tracking URL format, and the full carrier status vocabulary. The unit
tests in `tests/courier/` verify the adapter's *logic* (conversion, retry, caching, refusal to
guess) against a stubbed `fetch` — they cannot verify the wire format.
