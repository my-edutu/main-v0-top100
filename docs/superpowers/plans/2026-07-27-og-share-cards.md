# Auto-generated OG Share Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every public page previews on social platforms as a branded 1200×630 card built from that page's own hero image with that page's own header drawn on it.

**Architecture:** A single `next/og` route at `/og` renders cards from query parameters. All pure logic (parameter clamping, hero-host validation, URL building, metadata assembly) lives in `lib/og.ts` so it is unit-testable without invoking the renderer. A registry in `lib/og-pages.ts` maps each public static route to its card. Pages spread a `ogMetadata()` helper into their existing metadata. A coverage test walks `app/` and fails if a public page has no card.

**Tech Stack:** Next.js 15.5 App Router, `next/og` (`ImageResponse`), TypeScript, Vitest (node environment, `tests/**/*.test.ts`).

## Global Constraints

- The renderer route is `app/og/route.tsx` — **not** under `/api`. `next.config.mjs` applies `Cache-Control: no-store, max-age=0` to `/api/:path*`, which would defeat caching and emit conflicting headers.
- Card dimensions are exactly 1200×630.
- The route must never throw. Any failure path (bad params, unfetchable hero, failed font fetch) still returns a 200 PNG.
- `hero` is accepted only for same-origin paths and these hostnames: `www.top100afl.com`, `top100afl.com`, `*.supabase.co`, `flagcdn.com`, `i.ytimg.com`, `img.youtube.com`. Anything else is dropped. Without this the route is an open image proxy.
- Site origin comes from `SITE_URL` in `lib/site.ts`; site name from `SITE_NAME`. Never hardcode either.
- Brand palette for cards: base `#070B18`, accent `#F59E0B`, title `#FFFFFF`, muted `#C7CEDB`.
- Admin (`app/admin`), auth (`app/auth`), dashboard (`app/dashboard`), and `app/edit-profile` routes are out of scope and keep inheriting the root layout's `/og-home.png`.
- Commit messages must not include a `Co-Authored-By` trailer.

**Deviation from the spec, deliberate:** the spec put the registry and helpers both in `lib/og.ts`. This plan splits them — `lib/og.ts` (logic, ~200 lines) and `lib/og-pages.ts` (the route→card data table, ~40 entries). Same public surface, but the data table churns on every new page while the logic does not, and keeping them apart makes each file focused.

---

### Task 1: Card logic and URL building — `lib/og.ts`

**Files:**
- Create: `lib/og.ts`
- Test: `tests/og/og-lib.test.ts`

**Interfaces:**
- Consumes: `SITE_URL`, `SITE_NAME` from `lib/site.ts` (already exist).
- Produces:
  - `type OgVariant = "banner" | "profile"`
  - `type OgCard = { title: string; eyebrow?: string; subtitle?: string; meta?: string; hero?: string | null; variant?: OgVariant }`
  - `const OG_WIDTH = 1200`, `OG_HEIGHT = 630`
  - `const OG_LIMITS = { title: 120, subtitle: 160, eyebrow: 48, meta: 64 }`
  - `function clampText(value: string | null | undefined, max: number): string | undefined`
  - `function isAllowedHero(hero: string): boolean`
  - `function ogImageUrl(card: OgCard): string`
  - `function parseOgCard(params: URLSearchParams): OgCard`
  - `function ogMetadata(card: OgCard, opts?: OgMetadataOptions): Metadata`
  - `type OgMetadataOptions = { url?: string; type?: "website" | "article" | "profile"; description?: string }`

- [ ] **Step 1: Write the failing test**

Create `tests/og/og-lib.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { SITE_NAME, SITE_URL } from "@/lib/site"
import { clampText, isAllowedHero, ogImageUrl, ogMetadata, parseOgCard } from "@/lib/og"

describe("clampText", () => {
  it("returns undefined for empty or missing values", () => {
    expect(clampText(undefined, 10)).toBeUndefined()
    expect(clampText(null, 10)).toBeUndefined()
    expect(clampText("   ", 10)).toBeUndefined()
  })

  it("trims and passes through short values", () => {
    expect(clampText("  Blog  ", 10)).toBe("Blog")
  })

  it("truncates long values on a word boundary with an ellipsis", () => {
    const clamped = clampText("Stories and insights from Africa's future leaders", 20)
    expect(clamped).toBeDefined()
    expect(clamped!.length).toBeLessThanOrEqual(20)
    expect(clamped!.endsWith("…")).toBe(true)
  })

  it("collapses newlines so they cannot break the layout", () => {
    expect(clampText("Line one\nLine two", 40)).toBe("Line one Line two")
  })
})

describe("isAllowedHero", () => {
  it("accepts same-origin absolute paths", () => {
    expect(isAllowedHero("/magazine-cover-2025.jpg")).toBe(true)
    expect(isAllowedHero("/blog/one young world.png")).toBe(true)
  })

  it("rejects protocol-relative paths that would escape the origin", () => {
    expect(isAllowedHero("//evil.example.com/x.jpg")).toBe(false)
  })

  it("accepts the allowed remote hosts", () => {
    expect(isAllowedHero("https://zsavekrhfwrpqudhjvlq.supabase.co/storage/a.jpg")).toBe(true)
    expect(isAllowedHero("https://i.ytimg.com/vi/abc/hq.jpg")).toBe(true)
    expect(isAllowedHero(`${SITE_URL}/og-home.png`)).toBe(true)
  })

  it("rejects arbitrary external hosts and non-http schemes", () => {
    expect(isAllowedHero("https://evil.example.com/x.jpg")).toBe(false)
    expect(isAllowedHero("http://notsupabase.co.evil.com/x.jpg")).toBe(false)
    expect(isAllowedHero("data:image/png;base64,AAAA")).toBe(false)
    expect(isAllowedHero("")).toBe(false)
  })
})

describe("ogImageUrl", () => {
  it("builds an absolute /og url carrying the card", () => {
    const url = new URL(ogImageUrl({ title: "Our Initiatives", eyebrow: "Initiatives", hero: "/top100 magazine.webp" }))
    expect(url.origin).toBe(new URL(SITE_URL).origin)
    expect(url.pathname).toBe("/og")
    expect(url.searchParams.get("title")).toBe("Our Initiatives")
    expect(url.searchParams.get("eyebrow")).toBe("Initiatives")
    expect(url.searchParams.get("hero")).toBe("/top100 magazine.webp")
  })

  it("omits empty fields and omits the default banner variant", () => {
    const url = new URL(ogImageUrl({ title: "Legal" }))
    expect(url.searchParams.has("subtitle")).toBe(false)
    expect(url.searchParams.has("hero")).toBe(false)
    expect(url.searchParams.has("variant")).toBe(false)
  })

  it("keeps the profile variant", () => {
    const url = new URL(ogImageUrl({ title: "Amina Okonkwo", variant: "profile" }))
    expect(url.searchParams.get("variant")).toBe("profile")
  })

  it("drops a disallowed hero rather than passing it through", () => {
    const url = new URL(ogImageUrl({ title: "X", hero: "https://evil.example.com/x.jpg" }))
    expect(url.searchParams.has("hero")).toBe(false)
  })

  it("is stable for the same card so the cache key is stable", () => {
    const card = { title: "Events & Summits", eyebrow: "Events", hero: "/a.jpg" }
    expect(ogImageUrl(card)).toBe(ogImageUrl({ ...card }))
  })
})

describe("parseOgCard", () => {
  it("round-trips a card through ogImageUrl", () => {
    const card = {
      title: "Impact Interviews",
      eyebrow: "Interviews",
      subtitle: "Awardees on the work behind the recognition",
      hero: "/IMG_0676.jpg",
    }
    const parsed = parseOgCard(new URL(ogImageUrl(card)).searchParams)
    expect(parsed).toMatchObject(card)
    expect(parsed.variant).toBe("banner")
  })

  it("falls back to the site name when no title is supplied", () => {
    expect(parseOgCard(new URLSearchParams()).title).toBe(SITE_NAME)
  })

  it("rejects an unknown variant and a disallowed hero", () => {
    const params = new URLSearchParams({ title: "X", variant: "wat", hero: "https://evil.example.com/x.jpg" })
    const parsed = parseOgCard(params)
    expect(parsed.variant).toBe("banner")
    expect(parsed.hero).toBeNull()
  })
})

describe("ogMetadata", () => {
  it("produces openGraph and twitter blocks pointing at the same image", () => {
    const meta = ogMetadata(
      { title: "Events & Summits", eyebrow: "Events", hero: "/a.jpg", subtitle: "Where the network meets" },
      { url: "/events" },
    )
    const image = meta.openGraph!.images as Array<{ url: string; width: number; height: number; alt: string }>
    expect(image[0].width).toBe(1200)
    expect(image[0].height).toBe(630)
    expect(image[0].alt).toBe("Events & Summits")
    expect(image[0].url).toBe(ogImageUrl({ title: "Events & Summits", eyebrow: "Events", hero: "/a.jpg", subtitle: "Where the network meets" }))
    expect((meta.twitter!.images as string[])[0]).toBe(image[0].url)
    expect(meta.twitter!.card).toBe("summary_large_image")
  })

  it("sets an absolute openGraph url and the site name", () => {
    const meta = ogMetadata({ title: "Legal" }, { url: "/legal" })
    expect(meta.openGraph!.url).toBe(`${SITE_URL}/legal`)
    expect((meta.openGraph as { siteName?: string }).siteName).toBe(SITE_NAME)
  })

  it("prefers an explicit description over the subtitle", () => {
    const meta = ogMetadata({ title: "T", subtitle: "sub" }, { description: "explicit" })
    expect(meta.openGraph!.description).toBe("explicit")
    expect(meta.twitter!.description).toBe("explicit")
  })

  it("defaults the openGraph type to website and honours an override", () => {
    expect(ogMetadata({ title: "T" }).openGraph!.type).toBe("website")
    expect(ogMetadata({ title: "T" }, { type: "article" }).openGraph!.type).toBe("article")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/og/og-lib.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/og"`.

- [ ] **Step 3: Write the implementation**

Create `lib/og.ts`:

```ts
import type { Metadata } from "next"

import { SITE_NAME, SITE_URL } from "@/lib/site"

export type OgVariant = "banner" | "profile"

export type OgCard = {
  /** The page header. The one line that must be readable in a preview strip. */
  title: string
  /** Small-caps kicker above the title, e.g. "Blog", "Summit 2026". */
  eyebrow?: string
  /** Optional supporting line under the title. */
  subtitle?: string
  /** Profile variant only: country, cohort, or similar. */
  meta?: string
  /** The page's hero image: a same-origin path or an allowed remote URL. */
  hero?: string | null
  variant?: OgVariant
}

export type OgMetadataOptions = {
  /** Canonical path or absolute URL for og:url. */
  url?: string
  type?: "website" | "article" | "profile"
  /** Overrides the card subtitle as the og/twitter description. */
  description?: string
}

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/**
 * Text is clamped before layout because these values arrive as query
 * parameters. An unbounded title does not just look wrong — it pushes the
 * rest of the composition off the canvas.
 */
export const OG_LIMITS = {
  title: 120,
  subtitle: 160,
  eyebrow: 48,
  meta: 64,
} as const

const SITE_HOSTNAMES = new Set(["top100afl.com", "www.top100afl.com", new URL(SITE_URL).hostname])

/** Mirrors the remotePatterns already allowed in next.config.mjs. */
const ALLOWED_HERO_HOSTS = new Set(["flagcdn.com", "i.ytimg.com", "img.youtube.com"])
const ALLOWED_HERO_HOST_SUFFIXES = [".supabase.co"]

export function clampText(value: string | null | undefined, max: number): string | undefined {
  if (!value) return undefined
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length === 0) return undefined
  if (normalized.length <= max) return normalized

  const head = normalized.slice(0, max - 1)
  const lastSpace = head.lastIndexOf(" ")
  // Break on a word boundary when there is a reasonable one, so the clamp
  // does not slice a word in half.
  const body = lastSpace > max * 0.6 ? head.slice(0, lastSpace) : head
  return `${body.trimEnd()}…`
}

export function isAllowedHero(hero: string): boolean {
  if (!hero) return false

  // Same-origin path. "//host" is protocol-relative and would leave the origin.
  if (hero.startsWith("/")) return !hero.startsWith("//")

  let parsed: URL
  try {
    parsed = new URL(hero)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false

  const host = parsed.hostname.toLowerCase()
  if (SITE_HOSTNAMES.has(host)) return true
  if (ALLOWED_HERO_HOSTS.has(host)) return true
  return ALLOWED_HERO_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

function safeHero(hero: string | null | undefined): string | null {
  if (!hero) return null
  const trimmed = hero.trim()
  return isAllowedHero(trimmed) ? trimmed : null
}

/**
 * Serialises a card into its /og URL. The parameters fully determine the
 * rendered image, so the URL is its own cache key: change the title or the
 * hero and you get a different URL rather than a stale cached card.
 */
export function ogImageUrl(card: OgCard): string {
  const params = new URLSearchParams()
  const title = clampText(card.title, OG_LIMITS.title) ?? SITE_NAME
  const eyebrow = clampText(card.eyebrow, OG_LIMITS.eyebrow)
  const subtitle = clampText(card.subtitle, OG_LIMITS.subtitle)
  const meta = clampText(card.meta, OG_LIMITS.meta)
  const hero = safeHero(card.hero)

  // Fixed insertion order keeps the URL byte-identical for an identical card.
  params.set("title", title)
  if (eyebrow) params.set("eyebrow", eyebrow)
  if (subtitle) params.set("subtitle", subtitle)
  if (meta) params.set("meta", meta)
  if (hero) params.set("hero", hero)
  if (card.variant === "profile") params.set("variant", "profile")

  return `${SITE_URL}/og?${params.toString()}`
}

/** Inverse of ogImageUrl, used by the renderer. Always returns a usable card. */
export function parseOgCard(params: URLSearchParams): OgCard {
  const variant = params.get("variant") === "profile" ? "profile" : "banner"

  return {
    title: clampText(params.get("title"), OG_LIMITS.title) ?? SITE_NAME,
    eyebrow: clampText(params.get("eyebrow"), OG_LIMITS.eyebrow),
    subtitle: clampText(params.get("subtitle"), OG_LIMITS.subtitle),
    meta: clampText(params.get("meta"), OG_LIMITS.meta),
    hero: safeHero(params.get("hero")),
    variant,
  }
}

function absoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`
}

/**
 * Returns the openGraph and twitter blocks for a page. Spread this into a
 * page's metadata so no page hand-writes a share image URL twice.
 */
export function ogMetadata(card: OgCard, opts: OgMetadataOptions = {}): Metadata {
  const image = ogImageUrl(card)
  const title = clampText(card.title, OG_LIMITS.title) ?? SITE_NAME
  const description = opts.description ?? card.subtitle

  return {
    openGraph: {
      title,
      description,
      url: absoluteUrl(opts.url),
      siteName: SITE_NAME,
      type: opts.type ?? "website",
      images: [{ url: image, width: OG_WIDTH, height: OG_HEIGHT, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/og/og-lib.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/og.ts tests/og/og-lib.test.ts
git commit -m "feat(og): add share-card url builder and parameter validation"
```

---

### Task 2: The card renderer — `app/og/route.tsx`

**Files:**
- Create: `app/og/route.tsx`
- Modify: `middleware.ts:9`
- Test: `tests/og/og-route.test.ts`

**Interfaces:**
- Consumes: `parseOgCard`, `OG_WIDTH`, `OG_HEIGHT`, `OgCard` from `lib/og.ts` (Task 1); `SITE_URL` from `lib/site.ts`.
- Produces: `GET(request: Request): Promise<Response>` serving `image/png` at `/og`.

**Why middleware changes.** `middleware.ts` currently matches every path except `/api`, `/_next/static`, `/_next/image`, and `/favicon.ico`, so it would run `updateSession` — a Supabase round-trip — on every card render by every crawler. Add `og` to the exclusion group.

- [ ] **Step 1: Write the failing test**

Create `tests/og/og-route.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { GET } from "@/app/og/route"
import { SITE_URL } from "@/lib/site"

const render = (query: string) => GET(new Request(`${SITE_URL}/og?${query}`))

// Rendering runs satori + resvg; the first call also warms the font cache.
const RENDER_TIMEOUT = 30_000

describe("GET /og", () => {
  it("renders a banner card as a png", async () => {
    const response = await render("title=Events+%26+Summits&eyebrow=Events")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("image/png")
  }, RENDER_TIMEOUT)

  it("caches aggressively because the url is the cache key", async () => {
    const response = await render("title=Legal")
    const cacheControl = response.headers.get("cache-control") ?? ""
    expect(cacheControl).toContain("public")
    expect(cacheControl).toContain("s-maxage=31536000")
    expect(cacheControl).not.toContain("no-store")
  }, RENDER_TIMEOUT)

  it("still renders when the hero is missing", async () => {
    const response = await render("title=No+Hero+Here")
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("still renders when the hero is on a disallowed host", async () => {
    const response = await render("title=Blocked&hero=https%3A%2F%2Fevil.example.com%2Fx.jpg")
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("still renders when the hero url is allowed but unfetchable", async () => {
    const response = await render("title=Broken+Hero&hero=%2Fthis-file-does-not-exist.jpg")
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("renders a profile card", async () => {
    const response = await render("title=Amina+Okonkwo&subtitle=Climate-tech+founder&meta=Nigeria&variant=profile")
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("renders with no parameters at all", async () => {
    const response = await GET(new Request(`${SITE_URL}/og`))
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)

  it("renders an over-long title without failing", async () => {
    const response = await render(`title=${"word+".repeat(120)}`)
    expect(response.status).toBe(200)
  }, RENDER_TIMEOUT)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/og/og-route.test.ts`
Expected: FAIL — `Failed to resolve import "@/app/og/route"`.

- [ ] **Step 3: Write the implementation**

Create `app/og/route.tsx`:

```tsx
import { ImageResponse } from "next/og"

import { OG_HEIGHT, OG_WIDTH, parseOgCard, type OgCard } from "@/lib/og"
import { SITE_URL } from "@/lib/site"

export const runtime = "nodejs"

const BASE = "#070B18"
const ACCENT = "#F59E0B"
const TITLE = "#FFFFFF"
const MUTED = "#C7CEDB"

const BRAND_GRADIENT = `linear-gradient(135deg, ${BASE} 0%, #101A33 55%, #1B2340 100%)`
const SCRIM = "linear-gradient(90deg, rgba(7,11,24,0.94) 0%, rgba(7,11,24,0.82) 45%, rgba(7,11,24,0.35) 100%)"

type FontSpec = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }

/**
 * Fonts are fetched once per process, not once per request. A failed fetch
 * resolves to an empty set and satori falls back to its built-in font — an
 * off-brand card beats a 500 on a link someone already shared.
 */
let fontsPromise: Promise<FontSpec[]> | null = null

async function loadFonts(): Promise<FontSpec[]> {
  if (!fontsPromise) {
    fontsPromise = fetchUrbanist().catch(() => [])
  }
  return fontsPromise
}

async function fetchUrbanist(): Promise<FontSpec[]> {
  const weights: Array<400 | 700 | 800> = [400, 700, 800]
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Urbanist:wght@${weights.join(";")}&display=swap`,
    {
      // Google serves woff2 to modern browsers; satori needs ttf, which is
      // what the legacy user agent below gets us.
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" },
    },
  ).then((res) => (res.ok ? res.text() : Promise.reject(new Error(`font css ${res.status}`))))

  const urls = [...css.matchAll(/src:\s*url\((https:\/\/[^)]+)\)/g)].map((match) => match[1])
  if (urls.length === 0) throw new Error("no font urls in css")

  const specs = await Promise.all(
    weights.map(async (weight, index) => {
      const url = urls[index] ?? urls[urls.length - 1]
      const data = await fetch(url).then((res) =>
        res.ok ? res.arrayBuffer() : Promise.reject(new Error(`font ${res.status}`)),
      )
      return { name: "Urbanist", data, weight, style: "normal" as const }
    }),
  )

  return specs
}

/**
 * Resolves the hero to a fetchable absolute URL. Validation already happened
 * in parseOgCard; this only turns a same-origin path into an absolute URL and
 * confirms the bytes actually exist, so the layout can fall back cleanly.
 */
async function resolveHeroSrc(hero: string | null): Promise<string | null> {
  if (!hero) return null

  const absolute = hero.startsWith("/") ? new URL(hero, SITE_URL).toString() : hero

  try {
    const response = await fetch(absolute)
    if (!response.ok) return null
    const type = response.headers.get("content-type") ?? ""
    if (!type.startsWith("image/")) return null
    return absolute
  } catch {
    return null
  }
}

/** Titles step down as they grow so three lines always fit the canvas. */
function titleSize(title: string): number {
  if (title.length <= 42) return 72
  if (title.length <= 78) return 56
  return 44
}

function Eyebrow({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: ACCENT,
      }}
    >
      <div style={{ width: 44, height: 4, background: ACCENT, borderRadius: 2 }} />
      <span>{text}</span>
    </div>
  )
}

function Wordmark() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: TITLE, letterSpacing: 1 }}>TOP100 AFL</span>
      <span style={{ fontSize: 18, color: MUTED }}>top100afl.com</span>
    </div>
  )
}

function BannerCard({ card, heroSrc }: { card: OgCard; heroSrc: string | null }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: BRAND_GRADIENT,
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      {heroSrc ? (
        <img
          src={heroSrc}
          width={OG_WIDTH}
          height={OG_HEIGHT}
          style={{ position: "absolute", inset: 0, width: OG_WIDTH, height: OG_HEIGHT, objectFit: "cover" }}
        />
      ) : null}

      {/* Scrim so the header holds contrast over any photograph. */}
      <div style={{ position: "absolute", inset: 0, background: SCRIM, display: "flex" }} />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          width: "100%",
          height: "100%",
          padding: 72,
        }}
      >
        {card.eyebrow ? <Eyebrow text={card.eyebrow} /> : null}

        <div
          style={{
            display: "flex",
            fontSize: titleSize(card.title),
            fontWeight: 800,
            color: TITLE,
            lineHeight: 1.08,
            marginTop: card.eyebrow ? 22 : 0,
            maxWidth: 940,
          }}
        >
          {card.title}
        </div>

        {card.subtitle ? (
          <div style={{ display: "flex", fontSize: 28, color: MUTED, lineHeight: 1.35, marginTop: 20, maxWidth: 880 }}>
            {card.subtitle}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 34 }}>
          <Wordmark />
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ card, heroSrc }: { card: OgCard; heroSrc: string | null }) {
  const PORTRAIT_WIDTH = 420

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BRAND_GRADIENT,
        fontFamily: "Urbanist, sans-serif",
      }}
    >
      <div style={{ display: "flex", width: PORTRAIT_WIDTH, height: "100%", position: "relative", background: "#101A33" }}>
        {heroSrc ? (
          <img
            src={heroSrc}
            width={PORTRAIT_WIDTH}
            height={OG_HEIGHT}
            style={{ width: PORTRAIT_WIDTH, height: OG_HEIGHT, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 140,
              fontWeight: 800,
              color: ACCENT,
            }}
          >
            {card.title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ position: "absolute", top: 0, right: 0, width: 6, height: OG_HEIGHT, background: ACCENT, display: "flex" }} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          height: "100%",
          padding: 64,
        }}
      >
        {card.eyebrow ? <Eyebrow text={card.eyebrow} /> : null}

        <div
          style={{
            display: "flex",
            fontSize: card.title.length <= 24 ? 64 : 48,
            fontWeight: 800,
            color: TITLE,
            lineHeight: 1.1,
            marginTop: card.eyebrow ? 24 : 0,
          }}
        >
          {card.title}
        </div>

        {card.subtitle ? (
          <div style={{ display: "flex", fontSize: 28, color: MUTED, lineHeight: 1.35, marginTop: 18 }}>
            {card.subtitle}
          </div>
        ) : null}

        {card.meta ? (
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: ACCENT, marginTop: 24 }}>{card.meta}</div>
        ) : null}

        <div style={{ display: "flex", marginTop: 40 }}>
          <span style={{ fontSize: 20, color: MUTED, letterSpacing: 1 }}>top100afl.com</span>
        </div>
      </div>
    </div>
  )
}

export async function GET(request: Request): Promise<Response> {
  const card = parseOgCard(new URL(request.url).searchParams)

  const [heroSrc, fonts] = await Promise.all([resolveHeroSrc(card.hero ?? null), loadFonts()])

  return new ImageResponse(
    card.variant === "profile" ? (
      <ProfileCard card={card} heroSrc={heroSrc} />
    ) : (
      <BannerCard card={card} heroSrc={heroSrc} />
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: fonts.length > 0 ? fonts : undefined,
      headers: {
        // The query string fully determines the pixels, so the URL is the
        // cache key and a card can be cached indefinitely.
        "Cache-Control": "public, max-age=0, s-maxage=31536000, immutable",
      },
    },
  )
}
```

- [ ] **Step 4: Exclude `/og` from middleware**

In `middleware.ts`, replace line 9:

```ts
  matcher: ['/((?!api|og|_next/static|_next/image|favicon.ico).*)'],
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/og/`
Expected: PASS. If the sandbox has no network, the font fetch falls back silently and the tests still pass — that fallback is the point.

- [ ] **Step 6: Verify the route renders in the real app**

Run: `npm run dev` then open
`http://localhost:3000/og?title=Events%20%26%20Summits&eyebrow=Events&hero=/Africa%20Future%20leaders%20festival.png`
Expected: a 1200×630 card, hero photo behind a dark scrim, amber "EVENTS" kicker, white title, wordmark bottom-right. Check the title is legible when the image is scaled to ~500px wide — that is the size it will appear at in a chat preview.

- [ ] **Step 7: Commit**

```bash
git add app/og/route.tsx tests/og/og-route.test.ts middleware.ts
git commit -m "feat(og): render branded share cards at /og"
```

---

### Task 3: The page registry — `lib/og-pages.ts`

**Files:**
- Create: `lib/og-pages.ts`
- Test: `tests/og/og-pages.test.ts`

**Interfaces:**
- Consumes: `OgCard` from `lib/og.ts` (Task 1).
- Produces: `const PAGE_OG: Record<string, OgCard>` and `function pageOg(route: string): OgCard`.

`pageOg` throws on an unknown route rather than returning undefined: a typo in a page's wiring should fail the build, not silently ship a card with no title.

- [ ] **Step 1: Write the failing test**

Create `tests/og/og-pages.test.ts`:

```ts
import { existsSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { PAGE_OG, pageOg } from "@/lib/og-pages"
import { OG_LIMITS, ogImageUrl } from "@/lib/og"

describe("PAGE_OG", () => {
  it("keys every entry on an absolute route path", () => {
    for (const route of Object.keys(PAGE_OG)) {
      expect(route.startsWith("/")).toBe(true)
      expect(route.endsWith("/")).toBe(false)
    }
  })

  it("gives every entry a non-empty title within the clamp limit", () => {
    for (const [route, card] of Object.entries(PAGE_OG)) {
      expect(card.title.trim().length, route).toBeGreaterThan(0)
      expect(card.title.length, route).toBeLessThanOrEqual(OG_LIMITS.title)
    }
  })

  it("points every hero at a file that actually exists in public/", () => {
    for (const [route, card] of Object.entries(PAGE_OG)) {
      if (!card.hero) continue
      expect(card.hero.startsWith("/"), route).toBe(true)
      const asset = path.join(process.cwd(), "public", decodeURIComponent(card.hero))
      expect(existsSync(asset), `${route} -> ${card.hero}`).toBe(true)
    }
  })

  it("builds a valid card url for every entry", () => {
    for (const [route, card] of Object.entries(PAGE_OG)) {
      const url = ogImageUrl(card)
      expect(() => new URL(url), route).not.toThrow()
      expect(new URL(url).searchParams.get("title"), route).toBe(card.title)
    }
  })
})

describe("pageOg", () => {
  it("returns the card for a known route", () => {
    expect(pageOg("/events").title).toBe("Events & Summits")
  })

  it("throws for an unknown route so a typo fails loudly", () => {
    expect(() => pageOg("/nope")).toThrow(/nope/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/og/og-pages.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/og-pages"`.

- [ ] **Step 3: Write the implementation**

Create `lib/og-pages.ts`:

```ts
import type { OgCard } from "@/lib/og"

/**
 * The share card for every public static route.
 *
 * Two jobs: it supplies the card for pages whose header is fixed, and it is
 * the fallback hero for dynamic pages — a blog post with no cover image falls
 * back to the /blog hero rather than to the generic home card.
 *
 * Heroes are same-origin paths under public/. A route with no suitable
 * photograph is left without a hero on purpose and renders on the brand
 * gradient, which is a better card than an unrelated stock photo.
 */
export const PAGE_OG: Record<string, OgCard> = {
  "/afl2026": {
    eyebrow: "AFL 2026",
    title: "Africa Future Leaders Summit 2026",
    subtitle: "The continent's rising leaders, in one room.",
    hero: "/IMG_0673.jpg",
  },
  "/africa-future-leaders": {
    eyebrow: "About",
    title: "Africa Future Leaders",
    subtitle: "Recognising and backing the continent's most promising young people.",
    hero: "/IMG_0674.jpg",
  },
  "/ambassadors/card": {
    eyebrow: "Ambassadors",
    title: "Ambassador Share Card",
    hero: "/IMG_0680.jpg",
  },
  "/apply": {
    eyebrow: "Apply",
    title: "Apply for the 2026 Africa Future Leaders Program",
    subtitle: "Nominations and applications for the next cohort.",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
  "/awardees": {
    eyebrow: "Directory",
    title: "Meet the Top100 Africa Future Leaders",
    subtitle: "400+ awardees across 31 countries.",
    hero: "/top100 2024.webp",
  },
  "/awardees-list": {
    eyebrow: "Directory",
    title: "Full Awardees List",
    subtitle: "Every Top100 Africa Future Leader, by cohort.",
    hero: "/IMG_0675.jpg",
  },
  "/blog": {
    eyebrow: "Blog",
    title: "Stories & Insights from Africa's Future Leaders",
    subtitle: "Essays, partnership spotlights, and leadership lessons from the network.",
    hero: "/blog/Top100 Africa Future Leaders patners with one young world.png",
  },
  "/events": {
    eyebrow: "Events",
    title: "Events & Summits",
    subtitle: "Where the Top100 network meets.",
    hero: "/Africa Future leaders festival.png",
  },
  "/get-started": {
    eyebrow: "Apply",
    title: "Apply for Top100 Africa Future Leaders 2026",
    subtitle: "Start your application in a few minutes.",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
  "/initiatives": {
    eyebrow: "Initiatives",
    title: "Our Initiatives — Scholarships, Summits & Opportunities",
    hero: "/top100 magazine.webp",
  },
  "/initiatives/opportunities": {
    eyebrow: "Opportunities",
    title: "Opportunities for African Youth",
    subtitle: "Scholarships, fellowships, grants, and internships, in one place.",
    hero: "/IMG_0676.jpg",
  },
  "/initiatives/opportunities/fellowships": {
    eyebrow: "Opportunities",
    title: "Fellowships for African Youth",
    hero: "/IMG_0676.jpg",
  },
  "/initiatives/opportunities/grants": {
    eyebrow: "Opportunities",
    title: "Grants for African Youth",
    hero: "/IMG_0677.jpg",
  },
  "/initiatives/opportunities/internships": {
    eyebrow: "Opportunities",
    title: "Internships for African Youth",
    hero: "/IMG_0678.jpg",
  },
  "/initiatives/opportunities/scholarships": {
    eyebrow: "Opportunities",
    title: "Scholarships for African Youth",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
  "/initiatives/project100": {
    eyebrow: "Project 100",
    title: "Project 100",
    subtitle: "Backing one hundred young Africans through school and beyond.",
    hero: "/IMG_0679.jpg",
  },
  "/initiatives/project100/scholarship": {
    eyebrow: "Project 100",
    title: "Project 100 Scholarship",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
  "/initiatives/summit": {
    eyebrow: "Summit",
    title: "Africa Future Leaders Summit",
    hero: "/IMG_0672.jpg",
  },
  "/initiatives/summit/2024": {
    eyebrow: "Summit 2024",
    title: "Africa Future Leaders Summit 2024",
    hero: "/top100 2024.webp",
  },
  "/initiatives/summit/2025": {
    eyebrow: "Summit 2025",
    title: "Africa Future Leaders Summit 2025",
    hero: "/IMG_0681.jpg",
  },
  "/initiatives/summit/2026": {
    eyebrow: "Summit 2026",
    title: "Africa Future Leaders Summit 2026",
    hero: "/IMG_0673.jpg",
  },
  "/initiatives/talk100-live": {
    eyebrow: "Talk100 Live",
    title: "Talk100 Live",
    subtitle: "Conversations with the people building Africa's future.",
    hero: "/IMG_0682.jpg",
  },
  "/interviews": {
    eyebrow: "Interviews",
    title: "Impact Interviews",
    subtitle: "Awardees on the work behind the recognition.",
    hero: "/IMG_0683.jpg",
  },
  "/join": {
    eyebrow: "Join",
    title: "Join the Top100 Africa Future Leaders Network",
    hero: "/IMG_0684.jpg",
  },
  "/legal": {
    eyebrow: "Legal",
    title: "Legal",
  },
  "/legal/cookies": {
    eyebrow: "Legal",
    title: "Cookie Policy",
  },
  "/legal/privacy": {
    eyebrow: "Legal",
    title: "Privacy & Data Policy",
  },
  "/legal/terms": {
    eyebrow: "Legal",
    title: "Terms of Use",
  },
  "/login": {
    eyebrow: "Members",
    title: "Member Sign In",
  },
  "/magazine": {
    eyebrow: "Magazine",
    title: "The Top100 Africa Future Leaders Magazine",
    hero: "/magazine-cover-2025.jpg",
  },
  "/magazine/afl2025": {
    eyebrow: "Magazine 2025",
    title: "Africa Future Leaders Magazine 2025",
    hero: "/magazine-cover-2025.jpg",
  },
  "/magazine/africa future leaders magazine 2024": {
    eyebrow: "Magazine 2024",
    title: "Africa Future Leaders Magazine 2024",
    hero: "/top100-africa-future-leaders-2024-magazine-cover-w.jpg",
  },
  "/partners": {
    eyebrow: "Partners",
    title: "Our Partners",
    subtitle: "The organisations backing Africa's next generation of leaders.",
    hero: "/IMG_0685.jpg",
  },
  "/partnership": {
    eyebrow: "Partnership",
    title: "Partner with Top100 Africa Future Leaders",
    subtitle: "Reach 10,000+ of Africa's most promising young people.",
    hero: "/IMG_0678.jpg",
  },
  "/signup": {
    eyebrow: "Members",
    title: "Claim Your Awardee Profile",
  },
  // Section fallbacks for dynamic routes whose records may carry no image.
  "/announcements": {
    eyebrow: "Announcement",
    title: "Announcements",
    hero: "/IMG_0680.jpg",
  },
  "/apply/[type]": {
    eyebrow: "Apply",
    title: "Application",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
}

export function pageOg(route: string): OgCard {
  const card = PAGE_OG[route]
  if (!card) {
    throw new Error(`No OG card registered for route "${route}". Add it to lib/og-pages.ts.`)
  }
  return card
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/og/og-pages.test.ts`
Expected: PASS. If the hero-existence assertion fails, the named asset is missing from `public/` — fix the path in the registry or drop the `hero` for that entry so it renders on the brand gradient.

- [ ] **Step 5: Commit**

```bash
git add lib/og-pages.ts tests/og/og-pages.test.ts
git commit -m "feat(og): register share cards for public static routes"
```

---

### Task 4: Wire server-rendered static pages

**Files:**
- Modify: `app/afl2026/page.tsx`, `app/apply/page.tsx`, `app/awardees-list/page.tsx`, `app/blog/page.tsx`, `app/events/page.tsx`, `app/get-started/page.tsx`, `app/initiatives/page.tsx`, `app/interviews/page.tsx`, `app/legal/page.tsx`, `app/legal/cookies/page.tsx`, `app/legal/privacy/page.tsx`, `app/legal/terms/page.tsx`, `app/magazine/page.tsx`, `app/partnership/page.tsx`, `app/africa-future-leaders/page.tsx`, `app/awardees/page.tsx`, `app/partners/page.tsx`, `app/ambassadors/card/page.tsx`, `app/initiatives/opportunities/fellowships/page.tsx`, `app/initiatives/opportunities/grants/page.tsx`, `app/initiatives/opportunities/internships/page.tsx`, `app/initiatives/opportunities/scholarships/page.tsx`, `app/initiatives/project100/page.tsx`, `app/initiatives/project100/scholarship/page.tsx`, `app/initiatives/summit/2024/page.tsx`, `app/initiatives/summit/2025/page.tsx`, `app/initiatives/summit/2026/page.tsx`

**Interfaces:**
- Consumes: `ogMetadata` from `lib/og.ts`, `pageOg` from `lib/og-pages.ts`.
- Produces: nothing new. Each page's exported `metadata` gains `openGraph` and `twitter` blocks.

There is no separate test for this task — Task 6's coverage test is what proves it landed. Verification here is `npm run build`.

- [ ] **Step 1: Wire a page that already exports metadata**

For each page that already has `export const metadata: Metadata = {...}`, add the import and spread the helper **last** so it replaces any hand-written `openGraph`/`twitter` block. Example — `app/events/page.tsx`:

```tsx
import { ogMetadata } from "@/lib/og"
import { pageOg } from "@/lib/og-pages"

export const metadata: Metadata = {
  title: 'Events & Summits | Top100 Africa Future Leaders',
  description: '…keep the existing description…',
  ...ogMetadata(pageOg("/events"), { url: "/events" }),
}
```

Delete the old `openGraph` and `twitter` literals from the object — leaving them above the spread is harmless but leaving them below silently wins. Do this for: `/afl2026`, `/apply`, `/awardees-list`, `/events`, `/get-started`, `/initiatives`, `/interviews`, `/legal`, `/legal/cookies`, `/legal/privacy`, `/legal/terms`, `/magazine`, `/partnership`, `/ambassadors/card`.

- [ ] **Step 2: Wire a page that exports no metadata**

For a server page with no metadata export, add one. Example — `app/awardees/page.tsx`, inserted after the existing imports:

```tsx
import type { Metadata } from "next"

import { ogMetadata } from "@/lib/og"
import { pageOg } from "@/lib/og-pages"

export const metadata: Metadata = {
  title: "Meet the Top100 Africa Future Leaders",
  description: "Browse 400+ Top100 Africa Future Leaders awardees across 31 countries.",
  ...ogMetadata(pageOg("/awardees"), { url: "/awardees" }),
}
```

Do this for: `/awardees`, `/africa-future-leaders`, `/partners`, `/initiatives/opportunities/fellowships`, `/initiatives/opportunities/grants`, `/initiatives/opportunities/internships`, `/initiatives/opportunities/scholarships`, `/initiatives/project100`, `/initiatives/project100/scholarship`, `/initiatives/summit/2024`, `/initiatives/summit/2025`, `/initiatives/summit/2026`, using each route's registry title and a one-line description drawn from the page's own copy.

- [ ] **Step 3: Wire the page that uses generateMetadata**

`app/blog/page.tsx` builds its metadata per page number. Inside `generateMetadata`, after `canonical` is computed, replace the existing `openGraph` and `twitter` blocks with:

```tsx
  return {
    title,
    description: PAGE_DESCRIPTION,
    alternates: { canonical },
    ...ogMetadata({ ...pageOg("/blog"), title }, { url: canonical, description: PAGE_DESCRIPTION }),
  };
```

The spread of `pageOg("/blog")` keeps the section hero and eyebrow while `title` carries the page number, so page 2 gets its own card.

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds. Note `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so the build will **not** catch a type error here — also run `npx tsc --noEmit` and check for errors in the files you touched. Pre-existing errors elsewhere in the repo are not yours to fix.

- [ ] **Step 5: Verify a card end-to-end**

Run: `npm run dev`, then `curl -s http://localhost:3000/events | grep -o 'og:image[^>]*'`
Expected: an `og:image` content URL pointing at `/og?title=Events...&hero=...`. Open that URL in a browser and confirm the card renders.

- [ ] **Step 6: Commit**

```bash
git add app
git commit -m "feat(og): wire share cards into public static pages"
```

---

### Task 5: Wire client-component pages and dynamic pages

**Files:**
- Create: `app/initiatives/opportunities/layout.tsx`, `app/initiatives/summit/layout.tsx`, `app/initiatives/talk100-live/layout.tsx`, `app/join/layout.tsx`, `app/magazine/afl2025/layout.tsx`, `app/signup/layout.tsx`, `app/login/layout.tsx`, `app/magazine/africa future leaders magazine 2024/layout.tsx`
- Modify: `app/awardees/[slug]/page.tsx:20-77`, `app/blog/[slug]/page.tsx:16-72`, `app/interviews/[slug]/page.tsx`, `app/announcements/[id]/page.tsx`, `app/[slug]/page.tsx`, `app/apply/[type]/page.tsx`, `app/awardees/[slug]/posts/[postSlug]/page.tsx`

**Interfaces:**
- Consumes: `ogMetadata` from `lib/og.ts`, `pageOg` from `lib/og-pages.ts`.
- Produces: nothing new.

**Why layouts.** These pages start with `"use client"`, and a client component cannot export `metadata`. A sibling `layout.tsx` is the standard way to attach metadata to a client page without converting it.

- [ ] **Step 1: Add a metadata layout for each client page**

Create each file with this shape. Example — `app/initiatives/summit/layout.tsx`:

```tsx
import type { Metadata } from "next"
import type { ReactNode } from "react"

import { ogMetadata } from "@/lib/og"
import { pageOg } from "@/lib/og-pages"

export const metadata: Metadata = {
  title: "Africa Future Leaders Summit",
  description: "The Africa Future Leaders Summit — the continent's rising leaders, in one room.",
  ...ogMetadata(pageOg("/initiatives/summit"), { url: "/initiatives/summit" }),
}

export default function SummitLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

Repeat for `/initiatives/opportunities`, `/initiatives/talk100-live`, `/join`, `/magazine/afl2025`, `/signup`, `/login`, and `/magazine/africa future leaders magazine 2024`, each using its own registry route, title, and description.

Note: a layout applies to the whole subtree. `/initiatives/opportunities/layout.tsx` therefore also wraps the four opportunity children wired in Task 4 — that is fine, because each child exports its own `metadata` which takes precedence over the layout's.

- [ ] **Step 2: Convert the awardee profile to a profile card**

In `app/awardees/[slug]/page.tsx`, replace the `imageUrl` line and the `openGraph`/`twitter` blocks in `generateMetadata` (currently lines ~51-76) with:

```tsx
  const card = {
    title: awardee.name,
    eyebrow: `Top100 AFL ${showcaseYear}`,
    subtitle: awardee.headline || awardee.tagline || cohortLabel,
    meta: [awardee.country, cohortLabel].filter(Boolean).join(" · "),
    hero: awardee.avatar_url || awardee.cover_image_url || null,
    variant: "profile" as const,
  }

  return {
    title,
    description,
    keywords,
    ...ogMetadata(card, { url: `/awardees/${awardee.slug}`, type: "profile", description }),
  }
```

This replaces the current behaviour of passing the raw portrait through as `openGraph.images`. Links already shared will re-scrape to the new card.

- [ ] **Step 3: Convert the blog post page**

In `app/blog/[slug]/page.tsx`, replace the `openGraph`/`twitter` blocks in `generateMetadata`. The article-specific fields (`publishedTime`, `authors`, `tags`) are merged into the helper's `openGraph` output rather than written alongside it, so the helper still owns the image:

```tsx
  const card = {
    title: post.title,
    eyebrow: "Blog",
    subtitle: post.excerpt,
    hero: post.coverImage && !post.coverImage.startsWith("/placeholder.svg") ? post.coverImage : pageOg("/blog").hero,
  };
  const share = ogMetadata(card, { url: canonical, type: "article", description });

  return {
    title,
    description,
    keywords,
    authors: [{ name: post.author }],
    alternates: { canonical },
    ...share,
    openGraph: {
      ...share.openGraph,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt || post.createdAt,
      authors: [post.author],
      tags: post.tags,
    },
  };
```

Delete the now-unused `shareImage` helper at the top of the file (lines 16-19) and the `imageUrl` variable — the placeholder screening it did now lives in the `hero` expression above.

- [ ] **Step 4: Convert the remaining dynamic pages**

`app/interviews/[slug]/page.tsx` — replace the `openGraph` block:

```tsx
  const card = {
    title: interview.title,
    eyebrow: "Impact Interviews",
    subtitle: interview.awardee_name,
    hero: interview.thumbnail_url || (interview.video_id ? youtubeThumbnail(interview.video_id) : pageOg("/interviews").hero),
  }

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/interviews/${interview.slug}` },
    ...ogMetadata(card, { url: `/interviews/${interview.slug}`, type: "article", description }),
  }
```

`app/announcements/[id]/page.tsx` and `app/[slug]/page.tsx` share the same body — apply the same change to both:

```tsx
    const card = {
        title: announcement.title,
        eyebrow: "Announcement",
        subtitle: description,
        hero: announcement.image_url || pageOg("/announcements").hero,
    }

    return {
        title: announcement.title,
        description,
        ...ogMetadata(card, { type: "article", description }),
    }
```

`app/apply/[type]/page.tsx` — use the `/apply/[type]` registry entry with the application type in the title:

```tsx
  ...ogMetadata({ ...pageOg("/apply/[type]"), title: `Apply — ${typeLabel}` }, { url: `/apply/${type}` }),
```

where `typeLabel` is the human-readable label the page already derives from its `type` param; if it has none, use the raw `type` value.

`app/awardees/[slug]/posts/[postSlug]/page.tsx` — a member post. Use the post's image with the author as the eyebrow:

```tsx
  ...ogMetadata(
    { title: post.title, eyebrow: awardee.name, subtitle: post.excerpt ?? undefined, hero: post.image_url ?? null },
    { url: `/awardees/${awardee.slug}/posts/${post.slug}`, type: "article" },
  ),
```

Match the actual field names on the post record in that file — read it before editing rather than assuming `image_url` and `excerpt`.

- [ ] **Step 5: Verify the build and types**

Run: `npm run build && npx tsc --noEmit`
Expected: build succeeds; no new type errors in the files you touched.

- [ ] **Step 6: Verify a profile card renders**

Run: `npm run dev`, then open an awardee profile and check its `og:image`:
`curl -s http://localhost:3000/awardees/<a-real-slug> | grep -o 'og:image[^>]*'`
Open the URL it prints. Expected: portrait in the left column, amber rule beside it, name and headline on the right.

- [ ] **Step 7: Commit**

```bash
git add app
git commit -m "feat(og): wire share cards into client and dynamic pages"
```

---

### Task 6: Coverage test

**Files:**
- Test: `tests/og/og-coverage.test.ts`

**Interfaces:**
- Consumes: `PAGE_OG` from `lib/og-pages.ts`.
- Produces: nothing. This is the guarantee that a public page added later cannot ship without a card.

- [ ] **Step 1: Write the failing test**

Create `tests/og/og-coverage.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { readdir } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { PAGE_OG } from "@/lib/og-pages"

const APP_DIR = path.join(process.cwd(), "app")

/** Routes that are never shared publicly and keep the root layout's card. */
const EXCLUDED_SEGMENTS = ["admin", "auth", "dashboard", "edit-profile"]

async function findPages(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const found: string[] = []

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (EXCLUDED_SEGMENTS.includes(entry.name)) continue
      found.push(...(await findPages(full)))
    } else if (entry.name === "page.tsx") {
      found.push(full)
    }
  }

  return found
}

/** app/(group)/a/[slug]/page.tsx -> /a/[slug] */
function routeFor(pageFile: string): string {
  const relative = path.relative(APP_DIR, path.dirname(pageFile))
  const segments = relative
    .split(path.sep)
    .filter((segment) => segment.length > 0 && !(segment.startsWith("(") && segment.endsWith(")")))
  return `/${segments.join("/")}`
}

/**
 * A page is covered when it wires the helper itself, when a sibling layout
 * does (client pages cannot export metadata), or when it has a registry entry.
 */
function isCovered(pageFile: string, route: string): boolean {
  if (PAGE_OG[route]) return true

  const wiresHelper = (file: string) => {
    try {
      return readFileSync(file, "utf8").includes("ogMetadata(")
    } catch {
      return false
    }
  }

  if (wiresHelper(pageFile)) return true
  return wiresHelper(path.join(path.dirname(pageFile), "layout.tsx"))
}

describe("share card coverage", () => {
  it("finds the public pages", async () => {
    const pages = await findPages(APP_DIR)
    expect(pages.length).toBeGreaterThan(20)
  })

  it("gives every public page a share card", async () => {
    const pages = await findPages(APP_DIR)
    const uncovered = pages
      .map((file) => ({ file: path.relative(process.cwd(), file), route: routeFor(file) }))
      .filter(({ file, route }) => route !== "/" && !isCovered(path.join(process.cwd(), file), route))

    expect(
      uncovered,
      `These public pages have no share card. Add a lib/og-pages.ts entry or spread ogMetadata() into their metadata:\n${uncovered
        .map(({ file, route }) => `  ${route}  (${file})`)
        .join("\n")}`,
    ).toEqual([])
  })

  it("exempts the home page, which has its own hand-made card", async () => {
    const pages = await findPages(APP_DIR)
    expect(pages.map(routeFor)).toContain("/")
  })
})
```

- [ ] **Step 2: Run test to verify it reports real gaps**

Run: `npx vitest run tests/og/og-coverage.test.ts`
Expected: either PASS, or FAIL listing pages missed in Tasks 4 and 5. If it fails, wire the listed pages the same way as their neighbours and re-run until green. Do not widen `EXCLUDED_SEGMENTS` to make it pass — the point of the test is that it complains.

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: all tests pass, including the pre-existing suites under `tests/awards`, `tests/interviews`, and the rest.

- [ ] **Step 4: Commit**

```bash
git add tests/og/og-coverage.test.ts
git commit -m "test(og): fail the build when a public page has no share card"
```

---

### Task 7: Final verification

**Files:** none.

- [ ] **Step 1: Full build and test**

Run: `npm run build && npm test`
Expected: both succeed.

- [ ] **Step 2: Spot-check cards at preview size**

Run `npm run dev` and open each of these, viewing at roughly 500px wide:

- `/blog` — long title, three-line clamp
- `/legal/terms` — no hero, brand gradient
- an awardee profile — profile variant
- a blog post with a Supabase-hosted cover — remote hero fetch
- `/initiatives/summit/2026` — client page wired through a layout

Confirm on each: the header is legible, the hero is not cropping through a face, and the wordmark is visible.

- [ ] **Step 3: Validate one card with a real crawler**

Once deployed, paste a page URL into LinkedIn's Post Inspector or X's card validator and confirm the fetched image is the generated card. This cannot be verified locally — crawlers must reach the public origin.
