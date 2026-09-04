import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import HallOfFamePreview from "@/app/components/HallOfFamePreview"
import SpeakerPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/hall-of-fame/[slug]/page"
import HallOfFamePage, { metadata } from "@/app/hall-of-fame/page"
import { PAGE_OG } from "@/lib/og-pages"
import { SITE_URL } from "@/lib/site"
import { SPEAKERS, getFeaturedSpeakers } from "@/lib/speakers"

describe("Hall of Fame routes", () => {
  it("pre-renders one profile path per registered speaker", () => {
    expect(generateStaticParams()).toEqual(SPEAKERS.map(({ slug }) => ({ slug })))
  })

  it("publishes canonical and portrait-aware metadata", async () => {
    const ruby = SPEAKERS[0]
    const profileMetadata = await generateMetadata({ params: Promise.resolve({ slug: ruby.slug }) })

    expect(metadata.title).toBe("Hall of Fame")
    expect(metadata.alternates).toEqual({ canonical: `${SITE_URL}/hall-of-fame` })
    expect(profileMetadata.title).toBe(`${ruby.name} | Hall of Fame`)
    expect(profileMetadata.alternates).toEqual({
      canonical: `${SITE_URL}/hall-of-fame/${ruby.slug}`,
    })
    expect(JSON.stringify(profileMetadata.openGraph)).toContain(
      new URLSearchParams({ hero: ruby.portrait }).toString(),
    )
    expect(PAGE_OG["/hall-of-fame"]).toEqual({
      eyebrow: "Hall of Fame",
      title: "Leaders Who Chose Impact",
      subtitle: "The speakers who have inspired and supported the Top100 community.",
      hero: "/speakers/Ruby Igwe.jpeg",
    })
  })

  it("links every speaker from both the index and the cinematic preview", () => {
    const indexMarkup = renderToStaticMarkup(createElement(HallOfFamePage))
    const previewMarkup = renderToStaticMarkup(
      createElement(HallOfFamePreview, { speakers: getFeaturedSpeakers() }),
    )

    for (const { slug } of SPEAKERS) {
      expect(indexMarkup).toContain(`href="/hall-of-fame/${slug}"`)
    }
    for (const { slug } of getFeaturedSpeakers()) {
      expect(previewMarkup).toContain(`href="/hall-of-fame/${slug}"`)
    }
    expect(previewMarkup).toContain('href="/hall-of-fame"')
    expect(indexMarkup).toMatch(/<h2[^>]*>Ruby Igwe<\/h2>/)
    expect(previewMarkup).toContain('data-card-variant="cinematic"')

    const leyePosition = previewMarkup.indexOf("Leye Falade")
    const rubyPosition = previewMarkup.indexOf("Ruby Igwe")
    const belindaPosition = previewMarkup.indexOf("Belinda Nkechi Idinmachi")
    expect(leyePosition).toBeGreaterThan(-1)
    expect(leyePosition).toBeLessThan(rubyPosition)
    expect(rubyPosition).toBeLessThan(belindaPosition)
  })

  it("renders the homepage speakers as a compact, accessible horizontal poster rail", () => {
    const previewMarkup = renderToStaticMarkup(
      createElement(HallOfFamePreview, { speakers: getFeaturedSpeakers() }),
    )

    expect(previewMarkup).toContain('aria-label="Hall of Fame speakers"')
    expect(previewMarkup).toContain('data-speaker-rail="compact"')
    expect(previewMarkup).toContain("overflow-x-auto")
    expect(previewMarkup).toContain("auto-cols-[7.75rem]")
    expect(previewMarkup).toContain("sm:auto-cols-[9rem]")
    expect(previewMarkup).toContain("lg:auto-cols-[10rem]")
    expect(previewMarkup).toContain('aria-label="View Leye Falade’s Hall of Fame profile"')
  })

  it("uses AA orange accents and explicit white text", async () => {
    const indexMarkup = renderToStaticMarkup(createElement(HallOfFamePage))
    const previewMarkup = renderToStaticMarkup(
      createElement(HallOfFamePreview, { speakers: getFeaturedSpeakers() }),
    )
    const profileMarkup = renderToStaticMarkup(
      await SpeakerPage({ params: Promise.resolve({ slug: "ruby-igwe" }) }),
    )

    for (const markup of [indexMarkup, previewMarkup, profileMarkup]) {
      expect(markup).not.toContain("text-orange-600")
      expect(markup).not.toContain("ring-orange-500")
    }
    expect(previewMarkup).toContain("bg-orange-700")
    expect(previewMarkup).toContain("text-[#fff]")
  })

  it("renders bio and announcement artwork as separate figures when both exist", async () => {
    const markup = renderToStaticMarkup(
      await SpeakerPage({ params: Promise.resolve({ slug: "ruby-igwe" }) }),
    )

    expect(markup).toContain("Ruby Igwe 2025 speaker session artwork")
    expect(markup).toContain("Ruby Igwe 2025 speaker announcement")
    expect(markup.match(/<figure/g)).toHaveLength(2)
  })

  it("keeps the neutral profile copy when no biography exists", async () => {
    const markup = renderToStaticMarkup(
      await SpeakerPage({ params: Promise.resolve({ slug: "samuel-olarewaju" }) }),
    )

    expect(markup).toContain(
      "Part of the Top100 speaker community, sharing experience and perspective with Africa’s next generation of leaders.",
    )
  })
})
