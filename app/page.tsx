import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getHomepagePosts } from "@/lib/posts/server"
import { getHomepageAnnouncements, getHomepageEvents } from "@/lib/homepage-feed"
import { getFeaturedSpeakers } from "@/lib/speakers"

import HomePageHeroSection from "./components/HomePageHeroSection"
import HallOfFamePreview from "./components/HallOfFamePreview"
import HomeFeaturedAwardeesSection from "./components/HomeFeaturedAwardeesSection"
import BlogSection from "./components/BlogSection"
import MagazineSection from "./components/MagazineSection"
import ImpactSection from "./components/ImpactSection"
import PartnershipHeroSection from "./components/PartnershipHeroSection"
import InitiativeCards from "@/components/InitiativeCards"
import NewsletterForm from "./components/NewsletterForm"
import FAQSection from "./components/FAQSection"
import EventsHubSection from "./components/EventsHubSection"
import PortraitImage from "./components/PortraitImage"
import RotatingVisionSection from "./components/RotatingVisionSection"
import { TEAM_MEMBERS, VISION_IMAGES } from "@/lib/impact-content"

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

  return (
    <div className="bg-background text-foreground">
      <div className="flex flex-col pb-16 [--section-gap:clamp(1.5rem,5vw,2.5rem)] sm:[--section-gap:clamp(1.75rem,4vw,3rem)] lg:[--section-gap:clamp(2rem,3vw,3.5rem)] xl:[--section-gap:clamp(2rem,2vw,4rem)] gap-[var(--section-gap)]">
        <HomePageHeroSection />

        <HallOfFamePreview speakers={getFeaturedSpeakers()} />

        <section className="py-6">
          <div className="container space-y-6">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold font-sans">About the movement</h2>
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

        <RotatingVisionSection images={VISION_IMAGES} />



        <ImpactSection />


        <section className="py-6">
          <div className="container space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold font-sans">Our Partners</h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-900 mt-2 font-sans leading-relaxed tracking-wide">
                These partners amplify our mission, unlocking opportunities and resources for Africa's boldest innovators.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              {[
                { name: "One Young World West & Central Africa", logo: "/3.png", alt: "One Young World West and Central Africa logo" },
                { name: "ALX Nigeria", logo: "/7.png", alt: "ALX Nigeria logo" },
                { name: "Learning Planet Institute", logo: "/6.png", alt: "Learning Planet Institute logo" },
              ].map((partner, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="w-full h-16 sm:h-24 flex items-center justify-center mb-2 sm:mb-3">
                    <Image
                      src={partner.logo}
                      alt={partner.alt}
                      width={100}
                      height={40}
                      className="max-h-full max-w-full object-contain"
                      priority={index < 2} // Prioritize loading of first two sponsors
                    />
                  </div>
                  <p className={`text-center ${partner.name === "One Young World West & Central Africa" ? "text-xs" : "text-sm"} font-medium font-sans leading-relaxed tracking-wide`}>{partner.name}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center pt-2">
              <Button asChild className="rounded-full bg-slate-950 px-6 text-[#fff] hover:bg-orange-600">
                <Link href="/partnership">Partner with us <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

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
        <HomeFeaturedAwardeesSection />
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
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible lg:grid-cols-5">
              {TEAM_MEMBERS.map((member) => {
                const cardContent = (
                  <>
                    <div className="relative w-full h-32 sm:h-36 md:h-48 lg:h-56 xl:h-64 overflow-hidden rounded-t-[12px] sm:rounded-t-[16px]">
                      <PortraitImage
                        src={member.image}
                        name={member.name}
                        sizes="(max-width: 640px) 72vw, (max-width: 1024px) 50vw, 20vw"
                        className="object-cover object-top"
                      />
                    </div>
                    <div className="p-2 sm:p-3 md:p-4 xl:p-5 space-y-1 text-center">
                      <h3 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold line-clamp-2">{member.name}</h3>
                      <p className="text-[0.6rem] sm:text-xs md:text-sm lg:text-base xl:text-lg uppercase tracking-[0.05em] text-slate-900">{member.role}</p>
                    </div>
                  </>
                );

                return (
                  <div
                    key={member.name}
                    className={`w-[72vw] snap-start rounded-[12px] sm:w-auto sm:rounded-[16px] lg:rounded-[24px] border border-border/60 bg-card shadow-lg transition hover:-translate-y-1 hover:shadow-xl flex-shrink-0 ${member.linkedIn ? 'cursor-pointer hover:scale-[1.02]' : ''
                      }`}
                  >
                    {member.linkedIn ? (
                      <a
                        href={member.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on LinkedIn (opens in a new tab)`}
                        className="block rounded-[12px] sm:rounded-[16px] lg:rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        {cardContent}
                      </a>
                    ) : (
                      <div>{cardContent}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <PartnershipHeroSection />



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
