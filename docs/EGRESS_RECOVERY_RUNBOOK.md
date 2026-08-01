# Egress Recovery Runbook — 25 August 2026

What to do the day the Supabase restriction lifts.

## Background

On 1 Aug 2026 the project (`zsavekrhfwrpqudhjvlq`) was restricted with
`exceed_cached_egress_quota`: 10.425 GB against a 5 GB Free-plan allowance, at
209%. Every Supabase endpoint — Storage, REST, Auth — returned HTTP 402.

The cause was images. `next.config.mjs` carried `images: { unoptimized: true }`
from the original v0 scaffold, which disables Vercel's image optimizer, so every
`<Image>` streamed the full-size original out of Storage on every view and
Vercel never cached a resized copy. Uploads compounded it: all five upload
routes stored raw `File` bytes up to 5 MB, and the awardees directory rendered
18 of them per page as ~200px thumbnails through raw `<img>` tags.

An audit on 1 Aug ruled out every other candidate — no cron jobs, magazines are
Google Drive links, videos are on CloudFront, the service worker caches nothing,
Realtime is unused. DB egress sat at 0.511/5 GB (10%). Images were the whole
story.

Fixes shipped to `main` at `414f019` on 1 Aug, three weeks ahead of the reset:

| Commit | Change |
| --- | --- |
| `83a1211` | Removed `unoptimized: true`; `sizes` defaults on `BlogCover`/`Gallery` |
| `8312720` | Public awardee/event `<img>` → `next/image` |
| `f7a8ad2` | `processUpload()` — resize + webp on all five upload routes |
| `a6b4456` | OG hero probe GET → HEAD (was downloading every hero twice) |
| `6e78c06` | `scripts/backfill-storage-images.mjs` |

**The write-side fixes only apply to new uploads.** Everything already in
Storage is still a full-resolution original, and those are the objects actually
being served. The backfill is what fixes that, and it cannot run until the
restriction lifts. That is why this runbook exists.

---

## Before the 25th

- [ ] Confirm production is still running the fixed code. `main` must be at
      `414f019` or later, and it must include the five commits above.
- [ ] Check Vercel's image-transformation usage. The optimizer has been active
      since 1 Aug; cost moved from Supabase egress to the Vercel quota. If that
      number is uncomfortable, deal with it *before* adding backfill load.
- [ ] Draft the awardee comms but **do not send**. The point of waiting is to
      email 418 people once, after photos are back.

---

## Reset day, in order

Do not reorder. Each step gates the next.

### 1. Confirm the restriction actually lifted

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://zsavekrhfwrpqudhjvlq.supabase.co/storage/v1/object/public/awardees/"
```

`402` means still restricted — stop, try later. Anything else (`400`, `404`)
means the gateway is answering again.

Also confirm the usage panel shows the new cycle with cached egress near zero.
Restrictions clear on the cycle boundary, not on a fixed clock, so it may take
some hours past midnight.

### 2. Confirm the deployed code is the fixed build

```bash
curl -s https://www.top100afl.com/ | grep -c '_next/image'
```

Must be `> 0`. Zero means the optimizer is off and production is running
pre-fix code — **fix that before step 4**, or you will re-burn the quota while
the backfill runs.

### 3. Confirm real data is flowing again

```bash
curl -s "https://www.top100afl.com/api/posts?scope=homepage" | head -c 300
```

Blog covers should now be Supabase URLs rather than the local `/public` paths
the static fallback serves. Load `/awardees` and confirm photos render instead
of letter avatars.

If the site still shows fallback content, `unstable_cache` is holding a stale
5-minute window (`lib/posts/server.ts`, `revalidate: 300`). Wait it out or
redeploy.

### 4. Backfill Storage — before traffic builds

Do this early in the day. It is the single largest deliberate egress spend of
the cycle and you want it finished before real visitors add to it.

```bash
node scripts/backfill-storage-images.mjs             # dry run — reports only
```

Read the summary line. It prints total bytes before and after across the
`avatars`, `uploads`, and `awardees` buckets.

**Budget check before applying:** the script downloads every object to
re-encode it, so it spends roughly the *current* total bucket size in egress,
once. Against a 5 GB allowance:

- Under ~1 GB reported → safe, proceed.
- 1–2 GB → proceed, but expect to have spent a third of the cycle's budget.
- Over ~2 GB → do it in stages with `--bucket=awardees` first (the biggest and
  most-viewed), then reassess before the rest.

```bash
node scripts/backfill-storage-images.mjs --apply
```

Safe to re-run: objects already small enough are skipped, and re-encodes that
would not be at least 10% smaller are left alone.

Objects are rewritten **in place** at the same path — only the bytes and the
content-type change. No database row and no public URL is affected. A `.jpg`
path serving `image/webp` is correct; browsers honour the header, not the
extension.

### 5. Verify the backfill

- [ ] Hard-reload `/awardees` and spot-check that photos still render. Any
      broken image means an object was rewritten badly — check the script output
      for `!` lines.
- [ ] Spot-check an awardee detail page and a blog post cover.
- [ ] Re-read the usage panel and note cached egress. This is your baseline.

### 6. Only now, launch

Send the awardee comms. Open the impact-report flow. `app/interviews/` is live
in code and `interviews` + `interview_applications` are already in
`SETUP-ALL.sql`, applied 27 Jul — no migration needed.

---

## Watch for the first week

Check the Supabase usage panel **daily**, not weekly. The original overage took
about a week to build, so weekly checks would have caught it only after
restriction.

| Signal | Meaning |
| --- | --- |
| Cached egress climbing >500 MB/day | Something is still serving originals — re-audit |
| Cached egress flat after backfill | Working as intended |
| DB egress climbing fast | Not images. Look at `/events`, which refetches on every visit (`EventsPageClient:125`, unguarded) |
| Vercel transformations spiking | Optimizer working, but check the plan allowance |

Rough expectation after backfill: a directory page view should cost tens of KB
per photo rather than megabytes. If a single page view still moves the meter
perceptibly, stop and investigate before traffic grows.

---

## Known traps

- **Do not run the awards dispatch flow for real.** The ₦20,000 claim + Paystack
  path on `feat/member-awards-dispatch` is not production-ready and the GIG
  courier adapter is still a stub.
- **`/api/*` is never edge-cached.** `next.config.mjs` sets
  `Cache-Control: no-store` on every API route, so each client fetch is an
  uncached Supabase round-trip. Fine today because the homepage guards its
  fetches; relevant if you add new client-side data loading.
- **Two dead components carry live traps.** `BeatsSection.tsx` and
  `UpcomingEventsSection.tsx` are rendered nowhere. The latter has an *unguarded*
  `no-store` fetch that will fire per visitor the moment anyone wires it up.
  Delete them or guard them before reuse.
- **Storage is 1 GB on Free.** The backfill shrinks usage, which buys headroom,
  but new uploads are capped at 5 MB pre-processing. A few hundred more awardee
  photos will approach the ceiling.

## If it goes wrong

The restriction is not permanent damage — it clears each cycle. If you blow the
quota again:

1. The site does **not** go down. It degrades to static fallbacks: 418 real
   awardees from `public/top100 Africa future Leaders 2025.xlsx` and six seed
   blog posts with local `/public` covers. Only photos, auth, and writes break.
2. Do not create a second Supabase project as a stopgap unless you commit to
   making it permanent. A throwaway project splits accounts and uploads across
   two databases with no clean merge, and free projects pause after 7 days of
   inactivity — which silently 404s anything uploaded to it.
3. Upgrading to Pro lifts restrictions immediately. Note that a plan change
   **resets the billing cycle** to the day of the change.
