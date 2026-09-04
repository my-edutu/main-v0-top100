import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const fixtures = vi.hoisted(() => {
  const awardee = (name: string, featured: boolean) => ({
    awardee_id: `awardee-${name.toLowerCase()}`,
    profile_id: null,
    slug: name.toLowerCase(),
    name,
    email: null,
    country: "Ghana",
    current_school: null,
    field_of_study: null,
    course: null,
    bio: `${name} leads a community impact programme.`,
    avatar_url: null,
    cover_image_url: null,
    headline: null,
    tagline: null,
    personal_email: null,
    phone: null,
    location: "Accra, Ghana",
    achievements: null,
    gallery: null,
    video_links: null,
    social_links: null,
    interests: null,
    cohort: "2025",
    metadata: null,
    cgpa: null,
    year: 2025,
    featured,
    created_at: null,
    updated_at: null,
    is_public: true,
    role: "awardee",
    mentor: null,
    impact_projects: null,
    lives_impacted: null,
    awards_received: null,
    youtube_video_url: null,
  })
  const post = (index: number) => ({
    id: `post-${index}`,
    title: `Impact story ${index}`,
    slug: `impact-story-${index}`,
    author: "Top100 Africa Future Leaders",
    excerpt: `The field notes from impact story ${index}.`,
    contentHtml: `<p>Impact story ${index}</p>`,
    tags: ["impact"],
    coverImage: null,
    coverImageAlt: null,
    authorId: null,
    metaTitle: null,
    metaDescription: null,
    metaKeywords: null,
    scheduledAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    readTime: 3,
    isFeatured: index === 2,
    status: "published" as const,
  })

  return {
    awardees: [
      {
        ...awardee("Amina", false),
        country: null,
        location: null,
        bio: null,
        tagline: "Amina transforms communities across Africa.",
      },
      awardee("Kwame", true),
      awardee("Thandi", false),
      awardee("Zuri", true),
      awardee("Ngozi", false),
      awardee("Musa", false),
      awardee("Lebo", false),
    ],
    posts: [post(1), post(2), post(3), post(4)],
  }
})

vi.mock("@/lib/awardees", () => ({
  getAwardees: async () => fixtures.awardees,
}))

vi.mock("@/lib/posts/server", () => ({
  getHomepagePosts: async () => fixtures.posts,
}))

import { getImpactPageData } from "@/app/impacts/data"
import ImpactPage, { metadata } from "@/app/impacts/page"
import { galleryImages } from "@/lib/gallery-data"
import { PAGE_OG } from "@/lib/og-pages"
import { getFeaturedSpeakers } from "@/lib/speakers"
import { SITE_URL } from "@/lib/site"

describe("Impact hub", () => {
  it("publishes the approved share card and canonical destination", () => {
    expect(PAGE_OG["/impacts"]).toEqual({
      eyebrow: "Impact Beyond Recognition",
      title: "Celebrating the Work Beyond the Award",
      subtitle: "Leaders, stories, and moments creating lasting change across Africa.",
      hero: "/IMG_0679.jpg",
    })
    expect(metadata.alternates).toEqual({ canonical: `${SITE_URL}/impacts` })
  })

  it("selects featured leaders first and bounds every editorial feed", async () => {
    const data = await getImpactPageData()

    expect(data.featuredAwardees.map(({ slug }) => slug)).toEqual([
      "kwame",
      "zuri",
      "amina",
      "thandi",
      "ngozi",
      "musa",
    ])
    expect(data.stories.map(({ slug }) => slug)).toEqual([
      "impact-story-1",
      "impact-story-2",
      "impact-story-3",
    ])
    expect(data.moments).toEqual(galleryImages.slice(0, 6))
  })

  it("describes the selected event photographs without invented context or credits", () => {
    expect(
      galleryImages.slice(0, 6).map(({ src, alt, caption, category, credit }) => ({
        src,
        alt,
        caption,
        category,
        credit,
      })),
    ).toEqual([
      {
        src: "/IMG_0672.jpg",
        alt: "Attendees seated and talking at the Top100 Africa Future Leaders 2025 event",
        caption: "Attendees converse during the 2025 event.",
        category: "Event",
        credit: undefined,
      },
      {
        src: "/IMG_0673.jpg",
        alt: "Four people pose while an awardee holds a framed award",
        caption: "Four people pose while an awardee holds a framed award.",
        category: "Event",
        credit: undefined,
      },
      {
        src: "/IMG_0674.jpg",
        alt: "Four people pose with a framed Top100 Africa Future Leaders award",
        caption: "Four people pose with a framed award.",
        category: "Event",
        credit: undefined,
      },
      {
        src: "/IMG_0675.jpg",
        alt: "Three women pose at the Top100 Africa Future Leaders 2025 event",
        caption: "Three women pose at the 2025 event.",
        category: "Event",
        credit: undefined,
      },
      {
        src: "/IMG_0676.jpg",
        alt: "Attendees converse during the Top100 Africa Future Leaders 2025 event",
        caption: "Attendees converse during the 2025 event.",
        category: "Event",
        credit: undefined,
      },
      {
        src: "/IMG_0677.jpg",
        alt: "Four attendees pose with a framed Top100 Africa Future Leaders award",
        caption: "Four attendees pose with a framed award.",
        category: "Event",
        credit: undefined,
      },
    ])
  })

  it("server-renders the approved editorial pathways and selected content", async () => {
    const data = await getImpactPageData()
    const markup = renderToStaticMarkup(await ImpactPage())

    expect(markup).toContain("Celebrating the Work Beyond the Award")
    expect(markup).toContain('href="#leaders"')
    expect(markup).toContain('id="leaders"')
    expect(markup).toContain('href="/partnership"')
    expect(markup).toContain('href="/interviews"')
    expect(markup).toContain('href="/awardees"')
    expect(markup).toContain("31+")
    expect(markup).toContain("97,000")
    expect(markup).toContain("2,000+")
    expect(markup).toContain("Hear the work behind the recognition.")
    expect(markup).toContain(">KW</text>")
    expect(markup).toContain(
      'alt="Three people pose with a framed Top100 Africa Future Leaders 2025 award"',
    )

    const aminaCard = markup.match(/href="\/awardees\/amina"[\s\S]*?<\/article>/)?.[0]
    expect(aminaCard).toBeDefined()
    expect(aminaCard).toContain("Profile details coming soon.")
    expect(aminaCard).not.toContain(">Africa<")
    expect(aminaCard).not.toContain("Amina transforms communities across Africa.")
    expect(aminaCard).not.toContain("Building a legacy of leadership and community impact.")

    for (const { slug } of getFeaturedSpeakers()) {
      expect(markup).toContain(`href="/hall-of-fame/${slug}"`)
    }
    for (const { slug, name } of data.featuredAwardees) {
      expect(markup).toContain(`href="/awardees/${slug}"`)
      expect(markup).toContain(name)
    }
    for (const { slug } of data.stories) {
      expect(markup).toContain(`href="/blog/${slug}"`)
    }
    for (const { alt, caption } of data.moments) {
      expect(markup).toContain(`alt="${alt}"`)
      expect(markup).not.toContain(caption)
    }
  })

  it("presents event moments as a compact mobile grid without visible captions", async () => {
    const markup = renderToStaticMarkup(await ImpactPage())
    const momentsSection = markup.match(
      /aria-labelledby="event-moments-title"[\s\S]*?<\/section>/,
    )?.[0]

    expect(momentsSection).toBeDefined()
    expect(momentsSection).toContain("grid-cols-2")
    expect(momentsSection).not.toContain("<figcaption")
    for (const { alt } of galleryImages.slice(0, 6)) {
      expect(momentsSection).toContain(`alt="${alt}"`)
    }
  })

  it("uses decorative event photographs behind both closing calls to action", async () => {
    const markup = renderToStaticMarkup(await ImpactPage())
    const partnershipPanel = markup.match(
      /aria-labelledby="build-with-us-title"[\s\S]*?<\/article>/,
    )?.[0]
    const directoryPanel = markup.match(
      /aria-labelledby="impact-directory-title"[\s\S]*?<\/article>/,
    )?.[0]

    expect(partnershipPanel).toContain('alt=""')
    expect(partnershipPanel).toContain("%2FIMG_0676.jpg")
    expect(directoryPanel).toContain('alt=""')
    expect(directoryPanel).toContain("%2FIMG_0674.jpg")
  })

  it("shuffles spotlight cards without mutating or losing awardees", async () => {
    const spotlightModule = await import("@/app/impacts/ImpactAwardeeSpotlight").catch(() => null)

    expect(spotlightModule).not.toBeNull()
    if (!spotlightModule) return

    const original = fixtures.awardees.slice(0, 6)
    const originalSlugs = original.map(({ slug }) => slug)
    const shuffled = spotlightModule.shuffleSpotlightAwardees(original, () => 0.25)

    expect(original.map(({ slug }) => slug)).toEqual(originalSlugs)
    expect(shuffled.map(({ slug }) => slug)).not.toEqual(originalSlugs)
    expect(shuffled.map(({ slug }) => slug).sort()).toEqual([...originalSlugs].sort())
  })

  it("renders controlled empty states when awardees and stories are unavailable", async () => {
    const savedAwardees = fixtures.awardees.splice(0)
    const savedPosts = fixtures.posts.splice(0)

    try {
      const markup = renderToStaticMarkup(await ImpactPage())

      expect(markup).toContain("Awardee spotlights are currently unavailable.")
      expect(markup).toContain("No impact stories are published yet.")
      expect(markup).toContain('href="/awardees"')
      expect(markup).toContain('href="/blog"')
    } finally {
      fixtures.awardees.push(...savedAwardees)
      fixtures.posts.push(...savedPosts)
    }
  })

  it("uses AA orange accents and an ordered runtime fallback for story images", async () => {
    const markup = renderToStaticMarkup(await ImpactPage())

    expect(markup).not.toContain("text-orange-600")
    expect(markup).not.toContain("bg-orange-500")
    expect(markup).not.toContain("ring-orange-500")
    expect(markup).toContain("bg-orange-700")
    expect(markup).toContain("data-story-cover-count=\"1\"")
  })
})
