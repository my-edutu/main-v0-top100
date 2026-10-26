# GIG Logistics integration

The app uses GIG's documented third-party API for Nigerian award delivery. The
current quote path is **Price V3**:

- `POST /login` with `{ email, password }`
- authenticated requests with the `access-token` header
- `POST /price/v3` for delivery quotes
- `POST /capture/preshipment` for shipment creation
- `GET /track/mobileShipment?Waybill=...&fetchOption=1` for tracking
- `GET /localstations/get` for the station directory
- `GET /serviceCentresByStation?StationId=...` for verified service-centre
  coordinates

The production base URL is `https://thirdpartynode.theagilitysystems.com`.
The test base URL is `https://dev-thirdpartynode.theagilitysystems.com`.
See the [official API index](https://gig-logistics.readme.io/).

The retired `getaddressdetails` endpoint is **not called** anywhere. GIG never
documented it as part of this integration and its behaviour could not be
verified. Addresses are geocoded by Geoapify on the server instead.

## Price V3 request

Price V3 requires `ReceiverLocation`, `SenderLocation`, `PickUpOptions` and
`ShipmentItems`. The adapter sends this shape:

```json
{
  "SenderStationId": 4,
  "ReceiverStationId": 4,
  "VehicleType": 1,
  "SenderLocation": { "Latitude": 6.5298, "Longitude": 3.3145 },
  "ReceiverLocation": { "Latitude": 6.4281, "Longitude": 3.4219 },
  "ReceiverAddress": "12 Adeola Odeku Street, Victoria Island, Lagos, Nigeria",
  "IsPriorityShipment": false,
  "PickUpOptions": 0,
  "ShipmentItems": [
    {
      "SpecialPackageId": 0,
      "Quantity": 1,
      "Weight": 1,
      "ItemName": "Award plaque",
      "Description": "Award plaque",
      "IsVolumetric": false,
      "Value": 0,
      "ShipmentType": 1
    }
  ]
}
```

`PickUpOptions` is GIG's documented enum:

| Value | Meaning |
| --- | --- |
| `0` | Home delivery |
| `1` | Service-centre collection |

The previous `/price` body is still available for rollback by setting
`GIG_QUOTE_SCHEMA=legacy` (or pointing `GIG_PATH_QUOTE` at a non-v3 path). It is
no longer the default. Do not enable it unless GIG confirms your account still
accepts it.

## Geocoding (Geoapify)

Home-delivery coordinates come from a strict, server-only Geoapify lookup. The
adapter:

- sends `filter=countrycode:ng`;
- rejects country/state/county/district/city/postcode centroids, so it never
  prices from a guessed area centre;
- rejects results outside Nigeria's bounding box;
- supports an optional `GEOAPIFY_MIN_CONFIDENCE` threshold;
- times out after `GEOAPIFY_TIMEOUT_MS` and retries only network, timeout, 5xx
  and 429 responses;
- never substitutes a default coordinate when geocoding fails.

A geocoding failure declines the quote and parks the order at `quote_failed`
for manual pricing. The API returns a member-safe message plus a `code`
(`no_match`, `not_specific`, `outside_nigeria`, `timeout`, etc.).

The key is read from `GEOAPIFY_API_KEY`. It must be a server environment
variable; never prefix it with `NEXT_PUBLIC_`.

## Service-centre delivery

Service-centre requests do not geocode the member's street address. They use
GIG's verified `serviceCentresByStation` directory, filtered by the resolved
receiver station, and send the centre's `Latitude`/`Longitude` as
`ReceiverLocation` with `PickUpOptions: 1`.

Quote requests accept:

```json
{
  "deliveryMode": "service_centre",
  "serviceCentreId": 18
}
```

`deliveryMode` defaults to `home`. A service-centre request without a valid
`serviceCentreId` is rejected before the carrier is called.

Members can list centres with:

```text
GET /api/member/award/service-centres?state=Lagos&city=Victoria%20Island
```

That route is authenticated, rate-limited, and returns the same verified centre
data. When a quote succeeds, the resolved destination (mode, station, exact
coordinates and, for a service centre, its id/name) is stored in
`award_orders.gig_quote.delivery`. The payment webhook passes that record back
to the adapter, which books against it instead of geocoding again or re-reading
the directory. A home shipment therefore goes to the coordinates the member was
charged for, and a service-centre shipment goes to the centre that was priced,
even if the geocoder or the directory changes after checkout.

## Environment

Required when `GIG_ENABLED=true`:

```dotenv
GIG_ENABLED=true
GIG_API_BASE_URL=https://thirdpartynode.theagilitysystems.com
GIG_API_USERNAME=<supplied by GIG>
GIG_API_PASSWORD=<supplied by GIG>
GIG_SENDER_NAME=<your business name>
GIG_SENDER_PHONE=<pickup phone>
GIG_SENDER_ADDRESS=<pickup address>
GIG_SENDER_CITY=<pickup city>
GIG_SENDER_LATITUDE=<pickup latitude>
GIG_SENDER_LONGITUDE=<pickup longitude>
GIG_SENDER_STATION_ID=<GIG sender station id>
GEOAPIFY_API_KEY=<server-only Geoapify key>
# Leave GIG_RECEIVER_STATION_ID empty in production. It is resolved per user.
```

Optional tuning:

| Variable | Default | Purpose |
| --- | --- | --- |
| `GIG_PATH_QUOTE` | `price/v3` | Quote endpoint path. |
| `GIG_QUOTE_SCHEMA` | inferred from the path | `v3` or `legacy`. |
| `GIG_PATH_SERVICE_CENTRES` | `serviceCentresByStation` | Service-centre directory. |
| `GIG_TIMEOUT_MS` | `12000` | GIG request timeout. |
| `GIG_RETRIES` | `2` | Retries for login, quote, directory and tracking. Booking is never retried. |
| `GIG_SERVICE_CENTRE_CACHE_MS` | `86400000` | Service-centre cache TTL. |
| `GEOAPIFY_TIMEOUT_MS` | `6000` | Geocoder timeout. |
| `GEOAPIFY_RETRIES` | `1` | Geocoder retries after the first attempt. |
| `GEOAPIFY_MIN_CONFIDENCE` | `0` | Optional 0–1 confidence floor. |
| `GIG_QUOTE_EXTRA_JSON` | `{}` | Merged last into the quote body for account-specific fields. |

The sender station is your fixed pickup location. The receiver station is
resolved from the member's state and city against `localstations/get`. For a
city with multiple GIG stations, add an explicit mapping such as
`GIG_RECEIVER_STATION_MAP_JSON={"lagos:victoria island":349}` after confirming
the correct station with GIG. If no unique safe station exists, the quote
fails and the admin prices it manually.

## Verification checklist

Before enabling paid member checkout on a live account:

1. Call Price V3 for a real home address and a real service centre.
2. Confirm the response amount field. The adapter defaults to
   `data.data.GrandTotal` and falls back to other documented paths; pin
   `GIG_FIELD_QUOTE_AMOUNT` once confirmed.
3. Confirm the amount is **naira**, not kobo. The adapter converts naira to
   kobo with `Math.round(naira * 100)`. A kobo response would overcharge 100×.
4. Confirm the quoted currency is `NGN`.
5. Book **one** controlled shipment and confirm exactly one waybill in the GIG
   dashboard. Booking is never retried.
6. Confirm a service-centre booking includes
   `ReceiverDetails.DestinationServiceCenterId` and the centre coordinates.

## Remaining unverified items

The wire format above matches GIG's current published OpenAPI definition
(Price V3, service centres, capture preshipment). The adapter logic is covered
by stubbed tests, but no live GIG account is available in this environment.
Still verify against the production account:

- which amount field your account populates and whether it is naira;
- the station ids and vehicle type for your routes;
- that your account accepts Price V3;
- that service-centre pricing and booking match the selected centre;
- the tracking status vocabulary and customer-facing tracking URL.

Until those checks pass, leave `GIG_ENABLED` off or accept manual pricing.
Manual pricing is slower; it cannot overcharge.

## Rollback

Set `GIG_ENABLED=false` or unset any of `GIG_API_BASE_URL`,
`GIG_API_USERNAME` or `GIG_API_PASSWORD`. `getCourier()` immediately returns
`manualCourier`, which declines to quote and routes orders to `quote_failed`.
No data migration is required.

To roll back only the quote schema, set `GIG_QUOTE_SCHEMA=legacy`. Geocoding
and service-centre resolution remain active so no guessed coordinates are sent.
