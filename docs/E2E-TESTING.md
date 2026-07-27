# End-to-end test: admin invite → signup → dashboard → award → delivery

How to actually walk the awardee journey, and what will and will not work.

## 0. The blocker you must clear first

Verified against the live Supabase project on **2026-07-27**:

```
node scripts/verify-db.mjs
```

…reported **17 missing tables and 6 missing `profiles` columns**. `access_codes` does not exist, so
an admin cannot generate an invite code, so nobody can sign up, so nothing downstream of step 1 is
reachable. The code is fine; the database was never migrated.

Fix it once:

```bash
node scripts/build-setup-sql.mjs      # regenerates supabase/SETUP-ALL.sql
```

Then open the Supabase dashboard → SQL Editor → paste the whole of `supabase/SETUP-ALL.sql` → Run.
It is idempotent, so re-running it after adding a migration is safe.

Confirm:

```bash
node scripts/verify-db.mjs            # expect: all present
```

**Prerequisite:** `SETUP-ALL.sql` assumes `public.messages` already exists (it re-hardens that
table's RLS policies). It does exist in the live project. On a genuinely fresh database, run
`supabase/migrations/create_messages_table.sql` first — note that file is *not* idempotent and its
two permissive policies are deliberately replaced by `SETUP-MEMBER-HUB.sql`.

## 1. Environment

`.env.local` currently contains **only** the three Supabase keys. Each block below is optional and
degrades safely, but the feature it powers is inert without it.

| Variable | Without it |
|---|---|
| `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Checkout cannot start. **No real payment is possible today.** Use Paystack *test* keys. |
| `PAYSTACK_WEBHOOK_SECRET` (or the secret key) | The webhook cannot verify signatures, so orders never reach `paid`. |
| `GIG_API_BASE_URL`, `GIG_API_USERNAME`, `GIG_API_PASSWORD` | `getCourier()` returns the manual adapter: every quote fails and every order lands in `quote_failed` for manual admin pricing. |
| `GIG_ENABLED=true` | **Required in addition to the credentials.** Without it the GIG adapter stays off even when fully configured — see the warning below. |
| `BREVO_API_KEY` | Award milestone emails are skipped (logged, not sent). In-app notifications still write. |
| `TURNSTILE_SECRET_KEY` | Signup CAPTCHA is skipped entirely (`verifyCaptchaToken` returns `true` when unset). Fine for testing. |

**Use Paystack test keys only.** ₦20,000 plus shipping is a live charge otherwise.

### The GIG kill switch — read before setting `GIG_ENABLED`

The GIG adapter's field mapping was reconstructed from two third-party clients (GIG's own WooCommerce
plugin and an independent TypeScript client), because GIG's developer portal returns 403 to
non-browser clients and the API-reference host it links no longer resolves in DNS. **No vendor
document was readable and no live call has ever been made.**

Those two sources **disagree on which field holds the shipping amount**, so
`GIG_FIELD_QUOTE_AMOUNT` defaults to an ordered candidate list. More seriously, it is unconfirmed
whether GIG returns **naira or kobo**. The adapter converts naira → kobo (`* 100`). If GIG in fact
returns kobo, **every member is quoted and charged 100× the real delivery cost.**

That is why credentials alone are not enough: `getCourier()` also requires `GIG_ENABLED=true`, and
logs a warning when credentials are present without it. Before you set it:

1. Quote a known route (e.g. Lagos → Abuja) in a non-production environment.
2. Compare the figure against GIG's own price calculator for the same route.
3. Only then enable it.

Manual pricing is slower. It cannot overcharge anyone. Prefer it until step 2 passes.

## 2. The walkthrough

### Step 1 — Admin generates the invite code
`/admin/login` → `/admin/invites` → generate. Optionally bind it to an email and set uses/expiry.
Codes look like `AFL-K3M9Q-7VZ2R` (Crockford base32, 50 bits, no ambiguous characters).

Backed by `POST /api/admin/access-codes` → `lib/access-codes.ts`. Redemption is a compare-and-swap
loop, so two people racing a 1-use code cannot both redeem it.

### Step 2 — Awardee signs up
`/signup`. This is a **directory claim**, not open registration. The awardee must:
1. Pick their existing record from the `awardees` directory,
2. Use an email matching the one on file (when one is on file),
3. Enter the invite code.

The record must be unclaimed (`awardees.profile_id is null`). On any post-user failure the route
deletes the just-created auth user so no orphan is left. New profiles start at
`membership_status = 'pending'`.

### Step 3 — Log in and land on the dashboard
`/login` → `/dashboard`. First visit shows the welcome balloons. A pending member sees the
"pending review" banner; approve them at `/admin/members` to unlock approved-only broadcasts.

Sections: Home, BIO, Directory, Messages, Opportunities, My Award, Get featured, Events,
Partnerships, Magazine, Notifications, Settings — plus Groups and Posts (see the plans in
`docs/plans/`).

### Step 4 — Claim the award
Dashboard → **My Award** (a banner also pushes them there while `needsClaim` is true).

1. Enter the delivery address → `POST /api/member/award/quote`.
2. **Without GIG credentials the quote always fails** and the order goes to `quote_failed` with
   "Our team will contact you with a delivery cost." This is deliberate — the code never invents a
   shipping price. An admin then sets it at `/admin/awards`, which returns the order to `quoted`.
3. Totals panel shows award (₦20,000) + delivery + total.
4. Pay → `POST /api/member/award/checkout` → Paystack → back to `/dashboard?section=awards&payment=done`.
5. The dashboard polls for ~1 minute while the webhook lands, showing a confirming state with **no**
   Pay button, so a member cannot pay twice.

Status machine (`lib/awards/status.ts`):
`draft → quoted → awaiting_payment → paid → dispatched → in_transit → delivered`, with `quote_failed`
and `cancelled` off to the side. `paid` is settable **only** by the signature-verified Paystack
webhook — `/api/admin/awards` explicitly rejects a hand-set `paid` (403).

### Step 5 — Dispatch
`/admin/awards`. Paid-but-undispatched orders surface in a recovery queue. Record the waybill and
mark dispatched in one PATCH. The member's tracking panel then shows the waybill, and "Refresh
status" calls `GET /api/member/award/track`, which only ever advances status, never rewinds it.

### Step 6 — The rest of the network
Events + invitations/RSVP, exclusive opportunities, groups, and member posts — see `docs/plans/`.

## 3. What you cannot test in this environment

Be clear-eyed about these:

- **No real payment.** No Paystack keys are configured. With test keys you can exercise the full
  path, but the webhook must be reachable from Paystack — use a tunnel (`ngrok`) or deploy, because
  Paystack cannot reach `localhost`. Without the webhook the order stops at `awaiting_payment` and
  the confirmation poll times out into the "Payment received / we'll confirm shortly" copy.
- **No real courier.** No GIG credentials exist and no API docs are in the repo. The adapter's field
  mapping is written against the documented public shape and is **unverified against a live
  account** — see `docs/gig-integration.md` for the first-call checklist. Every path and field name
  is env-overridable so a wrong guess is a config change, not a code change.
- **No email delivery** without `BREVO_API_KEY`.

## 4. Unit tests

```bash
npm test            # vitest — pure logic: status machine, money, quotes, permissions, adapters
npx tsc --noEmit    # type check
```

These need no database and no network. They are the only automated verification the payment and
courier paths get, so treat a failure there as blocking.

## 5. Handy checks

```bash
node scripts/verify-db.mjs         # which tables/columns the live DB actually has (read-only)
node scripts/build-setup-sql.mjs   # regenerate the bootstrap after adding a migration
```
