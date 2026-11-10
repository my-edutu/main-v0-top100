import Link from "next/link"
import type { Metadata } from "next"

import { Button } from "@/components/ui/button"
import { getHomepagePosts } from "@/lib/posts/server"
import { getHomepageAnnouncements, getHomepageEvents } from "@/lib/homepage-feed"
import { getFeaturedSpeakers } from "@/lib/speakers"

import HomePageHeroSection from "./components/HomePageHeroSection"
import HomePartnersSection from "./components/HomePartnersSection"
import HomeProject100Section from "./components/HomeProject100Section"
import HallOfFamePreview from "./components/HallOfFamePreview"
import HomeFeaturedAwardeesSection from "./components/HomeFeaturedAwardeesSection"
import BlogSection from "./components/BlogSection"
import MagazineSection from "./components/MagazineSection"
import ImpactSection from "./components/ImpactSection"
import ImpactSeriesSection from "./components/ImpactSeriesSection"
import PartnershipHeroSection from "./components/PartnershipHeroSection"
import InitiativeCards from "@/components/InitiativeCards"
import NewsletterForm from "./components/NewsletterForm"
import FAQSection from "./components/FAQSection"
import EventsHubSection from "./components/EventsHubSection"
import RotatingVisionSection from "./components/RotatingVisionSection"
import TeamRail from "./components/TeamRail"
import { TEAM_MEMBERS, VISION_IMAGES } from "@/lib/impact-content"
import { SITE_URL } from "@/lib/site"
import { TalentDiscoveryHomeSection } from "@/components/talent/homepage-sections"
import { talentDiscoveryEnabled } from "@/lib/talent/features"

const homepageTitle = "Top100 Africa Future Leaders Hub | Awards, Events & Opportunities"
const homepageDescription =
  "Top100 Africa Future Leaders Hub celebrates exceptional young African leaders through awards, events, opportunities, and a continent-wide community."

export const metadata: Metadata = {
  title: { absolute: homepageTitle },
  description: homepageDescription,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: homepageTitle,
    description: homepageDescription,
    url: SITE_URL,
    siteName: "Top100 Africa Future Leaders Hub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: homepageTitle,
    description: homepageDescription,
  },
}

type Initiative = {
  title: string
  description: string
  href: string
}

const initiatives: Initiative[] = [
  {
    title: "Project100 Scholarship",
    description: "Backing mission-driven undergraduates with funding, mentors, and global exposure.",
    href: "/initiatives/project100",
  },
  {
    title: "Talk100 Live",
    description: "Monthly conversations with policymakers and pioneers tackling Africa's biggest challenges.",
    href: "/initiatives/talk100-live",
  },
  {
    title: "Future Leaders Summit",
    description: "Immersive leadership summit connecting awardees, partners, and investors.",
    href: "/initiatives/summit",
  },
  {
    title: "Opportunities Hub",
    description: "Career opportunities, grants, and fellowships curated for young African leaders.",
    href: "/initiatives/opportunities",
  },
]

export const revalidate = 300

export default async function HomePage() {
  const [homepagePosts, homepageEvents, homepageAnnouncements] = await Promise.all([
    getHomepagePosts(),
    getHomepageEvents(),
    getHomepageAnnouncements(),
  ])
  const showTalentDiscovery = talentDiscoveryEnabled()
  const hallOfFame = <HallOfFamePreview speakers={getFeaturedSpeakers()} />

  return (
    <div className="bg-background text-foreground">
      <div className="flex flex-col pb-16 [--section-gap:clamp(1.5rem,5vw,2.5rem)] sm:[--section-gap:clamp(1.75rem,4vw,3rem)] lg:[--section-gap:clamp(2rem,3vw,3.5rem)] xl:[--section-gap:clamp(2rem,2vw,4rem)] gap-[var(--section-gap)]">
        <HomePageHeroSection />

        <HomePartnersSection />

        {showTalentDiscovery ? <TalentDiscoveryHomeSection /> : hallOfFame}

        <section id="about-the-movement" aria-labelledby="about-the-movement-title" className="scroll-mt-24 py-6">
          <div className="container space-y-6">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 id="about-the-movement-title" className="text-2xl sm:text-3xl md:text-[2rem] font-semibold font-sans">About the movement</h2>
              <div className="space-y-4 text-lg sm:text-xl text-slate-900 font-sans leading-relaxed tracking-wide">
                <p>
                  We celebrate Africa's high-achieving youth leaders — from first-class graduates to innovators, changemakers, and student leaders — who are redefining what leadership looks like across the continent. From Lagos to Kigali, our awardees turn bold ideas into movements that uplift communities and create opportunities for their peers.
                </p>
              </div>
              <div className="pt-4">
                <Button asChild>
                  <Link href="/africa-future-leaders" className="text-base sm:text-lg">Explore our story</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <HomeFeaturedAwardeesSection />
        <HomeProject100Section />
        {showTalentDiscovery && hallOfFame}

        <ImpactSection />

        <RotatingVisionSection images={VISION_IMAGES} />

        <section id="initiatives" className="py-6">
          <div className="container space-y-6 sm:space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold font-sans">Our latest initiatives</h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-900 font-sans leading-relaxed tracking-wide">
                Each initiative unlocks mentorship, funding, and opportunities tailored for Africa&apos;s youth.
              </p>
            </div>
            <InitiativeCards />
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/initiatives" className="text-base sm:text-lg">Explore all initiatives</Link>
              </Button>
            </div>
          </div>
        </section>

        <EventsHubSection initialEvents={homepageEvents} initialAnnouncements={homepageAnnouncements} />
        <BlogSection initialPosts={homepagePosts} />
        <ImpactSeriesSection />
        <MagazineSection />

        <section className="py-2">
          <div className="container space-y-4">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold">
                Meet the people behind the platform
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-900">
                Programme leads, storytellers, and community builders sustaining the Top100 movement.
              </p>
            </div>
            <TeamRail members={TEAM_MEMBERS} />
          </div>
        </section>

        <PartnershipHeroSection showTalentPipelines={talentDiscoveryEnabled()} />



        <FAQSection />

        <section id="contact" className="py-6">
          <div className="container">
            <div className="rounded-[32px] border border-border/60 p-6 sm:p-8 lg:p-10">
              <div className="space-y-6 sm:space-y-7">
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-semibold font-sans">Stay in the loop</h2>
                  <p className="text-sm sm:text-base md:text-lg text-slate-900 font-sans leading-relaxed tracking-wide">
                    Get monthly highlights on awardees, opportunities, and events delivered straight to your inbox.
                  </p>
                </div>
                <NewsletterForm />
                <p className="text-xs sm:text-sm text-slate-900 font-sans leading-relaxed tracking-wide">
                  We respect your inbox. Expect one email per month with curated highlights and opportunities.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
