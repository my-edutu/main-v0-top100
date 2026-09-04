import { describe, expect, it } from "vitest"

import { advanceStoryCoverIndex } from "@/components/BlogCover"
import { resolveStoryCover, resolveStoryCoverCandidates } from "@/lib/story-covers"

describe("resolveStoryCover", () => {
  it("prefers a real post cover", () => {
    expect(resolveStoryCover({ slug: "known", coverImage: "/custom.jpg" }, 0)).toBe("/custom.jpg")
  })

  it("replaces placeholder and missing covers with curated local images", () => {
    expect(resolveStoryCover({ slug: "one-young-world-partners-with-top100", coverImage: null }, 0)).toBe(
      "/blog/Top100 Africa Future Leaders patners with one young world.png",
    )
    expect(resolveStoryCover({ slug: "unmapped", coverImage: "/placeholder.svg" }, 1)).toBe("/IMG_0677.jpg")
  })

  it("is deterministic for any index", () => {
    expect(resolveStoryCover({ slug: "unmapped", coverImage: null }, 8)).toBe("/IMG_0679.jpg")
  })

  it("provides a distinct fallback for every homepage story slot", () => {
    const covers = Array.from({ length: 6 }, (_, index) =>
      resolveStoryCover({ slug: `unmapped-${index}`, coverImage: null }, index),
    )

    expect(new Set(covers).size).toBe(6)
  })

  it("orders a remote cover before slug-specific and curated local fallbacks", () => {
    expect(
      resolveStoryCoverCandidates(
        {
          slug: "one-young-world-partners-with-top100",
          coverImage: "https://cdn.example.com/story.jpg",
        },
        0,
      ),
    ).toEqual([
      "https://cdn.example.com/story.jpg",
      "/blog/Top100 Africa Future Leaders patners with one young world.png",
      "/IMG_0674.jpg",
    ])
  })

  it("advances through every image candidate before revealing the generic fallback", () => {
    expect(advanceStoryCoverIndex(0, 3)).toBe(1)
    expect(advanceStoryCoverIndex(1, 3)).toBe(2)
    expect(advanceStoryCoverIndex(2, 3)).toBe(3)
    expect(advanceStoryCoverIndex(3, 3)).toBe(3)
  })
})
