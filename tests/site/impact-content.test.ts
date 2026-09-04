import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { HeroCtas } from "@/app/components/HomePageHeroSection"
import { IMPACT_HERO, IMPACT_STATS, TEAM_MEMBERS, VISION_IMAGES } from "@/lib/impact-content"
import type { ImpactHero, ImpactStats, VisionImages } from "@/lib/impact-content"

describe("impact content", () => {
  it("exports consumer-ready types for each impact constant", () => {
    const hero: ImpactHero = IMPACT_HERO
    const stats: ImpactStats = IMPACT_STATS
    const visionImages: VisionImages = VISION_IMAGES

    expect([hero, stats, visionImages]).toHaveLength(3)
  })

  it("uses the approved closed-application replacement", () => {
    expect(IMPACT_HERO).toEqual({
      eyebrow: "Our 2026 Focus",
      title: "Celebrating Impact Beyond Recognition",
      description:
        "Recognition is only the beginning. Discover the leaders turning achievement into lasting change across Africa.",
      primaryCta: { label: "Explore the impact", href: "/impacts" },
      secondaryCta: { label: "Partner with us", href: "/partnership" },
    })
  })

  it("renders the impact CTA as the branded gradient and the partnership destination as the secondary action", () => {
    const markup = renderToStaticMarkup(createElement(HeroCtas))

    expect(markup).toContain('href="/impacts"')
    expect(markup).toContain("bg-gradient-to-r")
    expect(markup).toContain("from-orange-500")
    expect(markup).toContain("to-amber-500")
    expect(markup).toContain('href="/partnership"')
    expect(markup).toContain("Partner with us")
  })

  it("publishes the approved movement metrics", () => {
    expect(IMPACT_STATS.map(({ value, suffix }) => `${value.toLocaleString()}${suffix}`)).toEqual([
      "31+",
      "97,000",
      "2,000+",
    ])
  })

  it("contains the approved team and no Chinedu entry", () => {
    expect(TEAM_MEMBERS.map((member) => [member.name, member.role])).toEqual([
      ["Nwosu Paul Light", "Founder"],
      ["Emmanuella Igboafu", "Team Lead"],
      ["Gabriel Ajewole", "Project Manager"],
      ["Favour Okolie", "Partnership Team"],
      ["Kenechukwu Igboasia", "Talent Management"],
    ])
    expect(TEAM_MEMBERS.some(({ name }) => name.includes("Chinedu"))).toBe(false)
  })

  it("rotates only known Top100 event photographs", () => {
    expect(VISION_IMAGES.length).toBeGreaterThanOrEqual(4)
    expect(VISION_IMAGES.every((src) => /^\/IMG_06(?:7|8)\d\.jpg$/.test(src))).toBe(true)
  })
})
