# Workstream 3 — Real GIG Logistics courier adapter

Read `docs/plans/00-SHARED-CONVENTIONS.md` first. It is binding.

## Goal
`lib/courier/gig.ts` is a deliberate stub: it always declines to quote and **throws** on dispatch, so
every award order lands in `quote_failed` and an admin prices and dispatches it by hand. Replace it
with a real adapter that returns a live delivery cost for the member's address and books a shipment
returning a waybill/parcel number.

## Files you own
- `lib/courier/gig.ts` (rewrite)
- `lib/courier/types.ts` (extend only — additive changes, never break existing consumers)
- `lib/courier/http.ts` (new — token cache + fetch wrapper)
- `tests/courier/*.test.ts`
- `docs/gig-integration.md`

**Do not touch** `lib/courier/manual.ts`, `lib/courier/index.ts`, or anything under
`app/api/member/award/` or `app/api/webhooks/` — other workstreams own those. `getCourier()` already
selects GIG when `GIG_API_BASE_URL` + `GIG_API_USERNAME` + `GIG_API_PASSWORD` are all set, so your
adapter activates automatically once credentials exist.

## Critical constraint — read before writing code
**There are no GIG credentials in this environment and no API documentation in the repo.** You cannot
make a real call and you cannot verify the wire format. Do not pretend otherwise.

Therefore:
1. Implement against GIG Logistics' documented public "Agility" REST shape
   (`POST /Admin/login` → bearer token; `POST /Thirdparty/price` for a quote;
   `POST /Thirdparty/captureshipment` for booking; `GET /Thirdparty/track/{waybill}`).
   Search the web for the current GIG/Agility third-party API reference and follow what you find; if
   sources conflict, pick the most recent and record the citation in `docs/gig-integration.md`.
2. Make every endpoint path and every request/response field name **configurable via env with the
   documented value as the default**, so a wrong guess is a config change rather than a code change.
   e.g. `GIG_PATH_QUOTE` (default `/Thirdparty/price`), `GIG_FIELD_QUOTE_AMOUNT` (default
   `GrandTotal`). Read response fields through a small `pickNumber(payload, path)` /
   `pickString(payload, path)` helper that accepts a dotted path.
3. Be explicit in code comments and in the doc that the field mapping is **unverified against a live
   account** and lists exactly what to check on first real call.

## Behaviour requirements
- **Never invent a price.** If the response is missing, unparseable, non-2xx, times out, or returns a
  zero/negative amount, return `{ ok: false, reason: <member-safe message>, raw }`. That routes the
  order to `quote_failed` for manual pricing, which is the existing safe path. Charging a member a
  guessed shipping cost is the one unacceptable failure here.
- Amounts: GIG returns **naira**, the app stores **kobo**. Convert with `Math.round(naira * 100)` and
  test the rounding explicitly. Reject non-finite and negative values.
- Auth: token from `POST /Admin/login`, cached in module scope with its expiry, refreshed ~60s early,
  and re-fetched exactly once on a 401 before giving up. Never log the password or the token.
- Timeouts: every call wrapped in `AbortSignal.timeout(Number(process.env.GIG_TIMEOUT_MS ?? 12000))`.
  Retry idempotent calls (login, quote, track) up to 2 times with backoff on network error or 5xx.
  **Never retry `book`** — a retried booking creates a duplicate shipment.
- `book()` must return the waybill/parcel number and, when present, a tracking URL. If the response
  is 2xx but carries no waybill, `throw` — a shipment we cannot identify is worse than a failure the
  admin sees, because `app/admin/awards/page.tsx` has a "paid but not dispatched" recovery queue.
- `track()` maps carrier status text to the app's `AwardStatus` values (`dispatched`, `in_transit`,
  `delivered`) via an explicit, case-insensitive lookup table, returning `'unknown'` for anything
  unrecognised. `app/api/member/award/track/route.ts` relies on `'unknown'` meaning "write nothing",
  so never guess a status.
- Keep `name` on the adapter meaningful: `'gig'` when configured.

## Tests — `tests/courier/gig.test.ts`
`vi.stubGlobal('fetch', ...)` throughout; zero network. Cover: successful quote → correct kobo;
naira→kobo rounding at `.005` boundaries; missing/zero/negative/NaN amount → `ok: false`; non-2xx →
`ok: false`; timeout/abort → `ok: false`; token cached across calls (fetch called once for login);
401 triggers exactly one re-login then succeeds; `book` returns waybill; `book` with no waybill in a
200 throws; `book` is never retried (assert exactly one call after a 500); status mapping table
including unknown text → `'unknown'`; env-override of a path and a field name takes effect.

## `docs/gig-integration.md`
Required env vars with defaults; the exact request/response shape assumed; every field-name override;
a first-call verification checklist ("call quote against a Lagos→Abuja address, confirm the amount
field name, confirm currency is naira"); and how to fall back (unset `GIG_API_BASE_URL` to return to
manual pricing).

## Report back
`npm test` and `npx tsc --noEmit` results, the citation(s) you used for the API shape, and an explicit
statement of exactly what remains unverified without live credentials.
