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
