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
})
