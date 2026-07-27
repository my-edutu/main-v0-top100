# Auto-generated share cards for every public page

**Date:** 2026-07-27
**Branch:** feat/member-awards-dispatch
**Status:** implemented 2026-07-27. See "Amendments during implementation" at the end.

## Problem

Only the home page has a purpose-built share image (`/og-home.png`). Every other
public page either inherits that same home card, points at a stand-in asset
(`/magazine-cover-2025.jpg` on `/events` and `/initiatives`), or supplies no
image at all (`/blog`, `/awardees`, most of `/initiatives/*`, `/legal/*`). A link
to a blog post, a summit page, or the awardee directory therefore previews as the
generic home card on WhatsApp, LinkedIn, X, and Slack — the reader cannot tell
what they are about to open.

Awardee profiles are the one exception: they already pass the awardee's cover or
avatar straight through as `openGraph.images`. That is better than nothing but
the raw portrait crops badly to 1.91:1 and carries no name or branding.

## Goal

Every public page previews as a branded 1200×630 card built from that page's own
hero image with that page's own header drawn on it, generated automatically, and
impossible to forget on a page added later.

Out of scope: admin, auth, and dashboard routes. They are never shared publicly
and keep inheriting the root layout's home card.

## Architecture

Three pieces plus a test.

```
app/og/route.tsx        renders the card       (presentation)
lib/og.ts               registry + helpers     (what each page says)
app/**/page.tsx         ...ogMetadata(card)    (wiring)
tests/og-coverage.test.ts   fails CI on an unwired public page
```

### 1. The generator — `app/og/route.tsx`

A single GET route rendering 1200×630 through `next/og`'s `ImageResponse`, on the
Node runtime to match the rest of the app.

**Why `/og` and not `/api/og`.** `next.config.mjs` applies
`Cache-Control: no-store, max-age=0` to `/api/:path*`. A card served from there
would be re-rendered on every crawler hit, and the two matching header rules
would emit conflicting `Cache-Control` values. `/og` sits outside that rule.

`middleware.ts` currently matches everything except `/api`, `/_next/static`,
`/_next/image`, and `/favicon.ico`, so it would run `updateSession` — a Supabase
round-trip — on every card render. Add `og` to the matcher's exclusion group.

**Query parameters**

| param | meaning |
| --- | --- |
| `title` | the page header, the line that must be readable |
| `eyebrow` | small-caps kicker above the title, e.g. `Blog`, `Summit 2026` |
| `subtitle` | optional supporting line |
| `hero` | the page's hero image, absolute path or allowed remote URL |
| `variant` | `banner` (default) or `profile` |
| `meta` | profile variant only: country, cohort, or similar |

**Layouts**

`banner` — hero full-bleed, darkened by a bottom-left linear scrim so text holds
contrast over any photograph. Eyebrow in the brand accent, small-caps, letter-spaced.
Title beneath it at 72px, stepping down to 56px then 44px as length grows, clamped
to three lines. Subtitle in muted white below. Logo mark and `top100afl.com` bottom-right.

`profile` — portrait full-bleed in the left 420px column, brand panel on the right
carrying `TOP100 AFL ▸ <year>`, the awardee's name, their headline, and their
country. Chosen over blurring the portrait as a background because faces survive
the crop and the strip preview stays legible.

**Hardening.** The parameters are untrusted. Title and subtitle are length-clamped
before layout so a long value cannot break the composition. `hero` is accepted only
when it is a same-origin path or its hostname matches the remote patterns already
allowed in `next.config.mjs` (`*.supabase.co`, `flagcdn.com`, `i.ytimg.com`);
anything else is dropped. Without that check the route is an open image proxy that
will fetch arbitrary URLs on request.

**Failure behaviour.** A missing, malformed, or unfetchable hero falls back to a
solid brand-gradient background — the card still renders with its header text. The
route never throws: a 500 here means a blank preview on a live shared link.

**Fonts.** Urbanist, matching the site, fetched from Google Fonts and held in
module scope so it costs one fetch per cold start. A failed font fetch falls back
to the built-in font rather than failing the render.

**Caching.** `Cache-Control: public, max-age=0, s-maxage=31536000, immutable`.
The parameters fully determine the output, so the URL is its own cache key; a
changed hero or title yields a different URL.

### 2. The registry and helpers — `lib/og.ts`

```ts
export type OgCard = {
  title: string
  eyebrow?: string
  subtitle?: string
  hero?: string
  variant?: "banner" | "profile"
  meta?: string
}

export const PAGE_OG: Record<string, OgCard>   // route -> card, static pages
export function ogImageUrl(card: OgCard): string
export function ogMetadata(card: OgCard, opts?: { url?: string; type?: string }): Metadata
```

`ogImageUrl` serialises a card into an absolute `/og?...` URL against `SITE_URL`
from `lib/site.ts`. `ogMetadata` returns a `Metadata` fragment carrying the full
`openGraph` and `twitter` blocks, so a page spreads it into its own metadata and
never writes an image URL twice.

`PAGE_OG` holds one entry per public static route. Its second job is to be the
fallback source for dynamic pages: a blog post with no cover image falls back to
the `/blog` entry's hero rather than to the home card.

### 3. Page wiring

Static public pages spread the helper into their existing metadata:

```ts
export const metadata: Metadata = {
  title: …,
  description: …,
  ...ogMetadata(PAGE_OG["/events"]),
}
```

Dynamic pages build the card from the record they already fetch, inside the
`generateMetadata` they already have:

- `/awardees/[slug]` — `profile` variant: portrait from `avatar_url`, name as
  title, headline as subtitle, country and cohort year as meta. Replaces the
  current raw-portrait `openGraph.images`.
- `/blog/[slug]` — cover image as hero, post title as title, `Blog` as eyebrow.
- `/interviews/[slug]` — subject's image as hero, `Impact Interviews` as eyebrow.
- `/announcements/[id]` — announcement image, `Announcement` as eyebrow.
- `/[slug]` — the CMS catch-all route, using whatever hero the page record carries.

Paginated routes (`/blog?page=2`) keep the section card; the page number already
lives in the title and does not need its own image.

### 4. Coverage test — `tests/og-coverage.test.ts`

Walks `app/` for `page.tsx` files, excludes the `admin`, `auth`, and `dashboard`
subtrees, and asserts that each remaining page either exports metadata containing
an OG image or has a `PAGE_OG` entry for its route. A public page added later
without a share card fails CI instead of silently shipping the home card.

This test is what makes the system automatic in the sense that matters. The
generation is mechanical; the guarantee of coverage is the part that has to be
enforced.

## Data flow

```
crawler → GET /page
            page.tsx generateMetadata
              → ogMetadata(card)  → og:image = SITE_URL/og?title=…&hero=…
crawler → GET /og?title=…&hero=…
            validate params, clamp text, check hero host
            fetch hero (or fall back to brand gradient)
            ImageResponse → 1200×630 PNG, cached at the edge for a year
```

## Testing

- Unit: `ogImageUrl` encodes and round-trips parameters; `ogMetadata` produces both
  `openGraph` and `twitter` blocks with the same image.
- Unit: hero host validation accepts same-origin paths and allowed hostnames,
  rejects arbitrary external URLs.
- Route: `/og` returns 200 and `image/png` for a normal card, for a card with a
  missing hero, for an over-long title, and for a hero on a disallowed host.
- Coverage: the walker test above.
- Manual: render a handful of cards locally and check them at preview size —
  a long-titled blog post, an awardee with no portrait, a summit page.

## Risks

- **Cold-start latency.** The first card render per lambda pays the font fetch and
  the hero fetch. Crawlers tolerate this; the year-long cache means it happens once
  per unique card.
- **Hero fetch failures at render time.** Covered by the gradient fallback, so the
  worst case is an unbranded-but-correct card rather than a broken preview.
- **Registry drift.** A hero asset renamed in `public/` leaves a stale path in
  `PAGE_OG`. The gradient fallback keeps the card working. Partly solved after
  all: `tests/og/og-pages.test.ts` asserts every registered hero exists on disk.

## Amendments during implementation

Two changes, both forced by looking at rendered output rather than by preference.

**A third layout, `cover`.** The design assumed two variants. Rendering
`/magazine` showed why that was wrong: a magazine cover carries its own
typography, so putting the page header on top produced text over text, with the
cover's "LEADERS / Magazine 2025" ghosting behind our title and a face cropped
through the middle. Posters and covers now render whole on the right of the card
with the header given clean space on the left. Applies to `/magazine`,
`/magazine/afl2025`, and the 2024 magazine route. Two further routes —
`/events` and `/initiatives` — had been pointed at a flyer and a magazine cover;
both now use photographs, which the `banner` layout was designed for.

**Redirect-only pages are exempt from coverage.** Five routes turned out to be
bare `redirect()` calls with no rendered HTML: `/africa-future-leaders`,
`/partners`, and `/initiatives/summit/{2024,2025,2026}`. They have nowhere to put
a meta tag, so the coverage test skips them and the destination carries the card.

One implementation trap worth recording: **satori does not honour the CSS `inset`
shorthand.** The scrim silently did not render, which put white text on a bright
yellow hero and looked like a colour problem rather than a positioning one. Fill
positioning is written out as explicit `top`/`left`/`right`/`bottom`.
