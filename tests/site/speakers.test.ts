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

  it("returns featured speakers in configured order", () => {
    expect(getFeaturedSpeakers().map(({ slug }) => slug)).toEqual(FEATURED_SPEAKER_SLUGS)
  })
})
