import { describe, expect, it } from "vitest"
import { PRIMARY_NAV_ITEMS } from "@/lib/site-navigation"

describe("public navigation", () => {
  it("promotes impact and Hall of Fame without Get Started", () => {
    expect(PRIMARY_NAV_ITEMS).toEqual([
      { label: "Home", href: "/" },
      { label: "Impact", href: "/impacts" },
      { label: "Hall of Fame", href: "/hall-of-fame" },
      { label: "Awardees", href: "/awardees" },
    ])
    expect(PRIMARY_NAV_ITEMS.some(({ label }) => label === ("Get Started" as string))).toBe(false)
  })
})
