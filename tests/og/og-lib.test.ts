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

  it("keeps every non-default variant", () => {
    expect(new URL(ogImageUrl({ title: "Amina Okonkwo", variant: "profile" })).searchParams.get("variant")).toBe(
      "profile",
    )
    expect(new URL(ogImageUrl({ title: "Magazine", variant: "cover" })).searchParams.get("variant")).toBe("cover")
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

  it("round-trips the cover variant", () => {
    const params = new URL(ogImageUrl({ title: "Magazine 2024", hero: "/a.jpg", variant: "cover" })).searchParams
    expect(parseOgCard(params).variant).toBe("cover")
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
    expect(image[0].url).toBe(
      ogImageUrl({ title: "Events & Summits", eyebrow: "Events", hero: "/a.jpg", subtitle: "Where the network meets" }),
    )
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
