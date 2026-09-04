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

  it("links every speaker from the index and featured speakers from the preview", () => {
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
