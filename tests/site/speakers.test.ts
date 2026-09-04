import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { FEATURED_SPEAKER_SLUGS, SPEAKERS, getFeaturedSpeakers, getSpeaker } from "@/lib/speakers"

describe("Hall of Fame registry", () => {
  it("contains ten uniquely addressable 2025 speakers", () => {
    expect(SPEAKERS).toHaveLength(10)
    expect(new Set(SPEAKERS.map(({ slug }) => slug)).size).toBe(SPEAKERS.length)
    expect(SPEAKERS.every(({ eventYears }) => eventYears.includes(2025))).toBe(true)
  })

  it("references assets that exist under public", () => {
    for (const speaker of SPEAKERS) {
      for (const asset of [speaker.portrait, speaker.bioArtwork, speaker.announcementArtwork].filter(Boolean)) {
        expect(existsSync(path.join(process.cwd(), "public", asset!.slice(1))), asset).toBe(true)
      }
    }
  })

  it("looks up known speakers and rejects unknown slugs", () => {
    expect(getSpeaker("ruby-igwe")?.name).toBe("Ruby Igwe")
    expect(getSpeaker("not-a-speaker")).toBeUndefined()
  })

  it("returns every speaker for the preview with the requested leaders first", () => {
    const featuredSlugs = getFeaturedSpeakers().map(({ slug }) => slug)

    expect(featuredSlugs.slice(0, 3)).toEqual([
      "leye-falade",
      "ruby-igwe",
      "belinda-nkechi-idinmachi",
    ])
    expect(featuredSlugs).toHaveLength(SPEAKERS.length)
    expect(new Set(featuredSlugs)).toEqual(new Set(SPEAKERS.map(({ slug }) => slug)))
    expect(featuredSlugs).toEqual(FEATURED_SPEAKER_SLUGS)
  })

  it("gives every speaker a substantive, impact-focused profile", () => {
    for (const speaker of SPEAKERS) {
      expect(speaker.impact, `${speaker.name} impact`).toBeTruthy()
      const wordCount = (speaker.impact ?? "").trim().split(/\s+/).length

      expect(wordCount, `${speaker.name} impact word count`).toBeGreaterThanOrEqual(80)
      expect(wordCount, `${speaker.name} impact word count`).toBeLessThanOrEqual(110)
    }
  })

  it("keeps publicly verified roles and organisations current", () => {
    expect(getSpeaker("leye-falade")?.label).toBe(
      "Managing Director & CEO, Nigeria LNG Limited · Director, Nigerian Economic Summit Group",
    )
    expect(getSpeaker("ruby-igwe")?.label).toBe(
      "Regional Director, West & Central Africa, ALX Africa · Co-Founder, Archivi.ng",
    )
    expect(getSpeaker("belinda-nkechi-idinmachi")?.label).toContain(
      "Entrepreneurship Programme Specialist, ALX Africa",
    )
    expect(getSpeaker("samuel-olarewaju")?.label).toContain("Food and Genes Initiative")
    expect(getSpeaker("tochukwu-idinmachi")?.label).toBe(
      "Shell professional · MBA · PMP-certified project leader",
    )
    expect(getSpeaker("yetunde-shado-asekun")?.label).toContain(
      "Head of Corrosion, JV Assets, TotalEnergies EP Nigeria",
    )
  })

  it("attributes verified impact claims to the correct leaders", () => {
    expect(getSpeaker("ruby-igwe")?.impact).toContain("130,000")
    expect(getSpeaker("ruby-igwe")?.impact).toContain("75,607")
    expect(getSpeaker("leye-falade")?.impact).toContain("Nigeria LNG")
    expect(getSpeaker("belinda-nkechi-idinmachi")?.impact).toContain("45% to 63%")
    expect(getSpeaker("kaitochukwu-chukwudi")?.impact).toContain("300 million")
    expect(getSpeaker("odinakachi-umunna")?.impact).toContain("proposed")
    expect(getSpeaker("samuel-olarewaju")?.impact).toContain("50,000")
    expect(getSpeaker("tochukwu-idinmachi")?.impact).toContain(
      "does not establish a more specific current title",
    )
  })
})
