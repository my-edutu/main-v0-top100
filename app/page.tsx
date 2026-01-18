import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Force dynamic rendering to prevent stale cached data
export const dynamic = 'force-dynamic'

import HomePageHeroSection from "./components/HomePageHeroSection"
import AwardeesSection from "./components/AwardeesSection"
import HomeFeaturedAwardeesSection from "./components/HomeFeaturedAwardeesSection"
import BlogSection from "./components/BlogSection"
import MagazineSection from "./components/MagazineSection"
import RecentEventsSection from "./components/RecentEventsSection"
import UpcomingEventsSection from "./components/UpcomingEventsSection"
import ImpactSection from "./components/ImpactSection"
import InitiativeCards from "@/components/InitiativeCards"
import NewsletterForm from "./components/NewsletterForm"
import TypeEffect from "@/components/TypeEffect"
import Counter from "@/components/Counter"
import FAQSection from "./components/FAQSection"
import AnnouncementsSection from "./components/AnnouncementsSection"
import EventsHubSection from "./components/EventsHubSection"

type Initiative = {
  title: string
  description: string
  href: string
}

type TeamMember = {
  name: string
  role: string
  linkedIn?: string
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

const teamMembers: TeamMember[] = [
  {
    name: "Nwosu Paul Light",
    role: "Founder",
    linkedIn: "https://www.linkedin.com/in/paul-light-/",
  },
  {
    name: "Emmanuella Igboafu",
    role: "Team Lead",
    linkedIn: "https://www.linkedin.com/in/emmanuellaigboafu/",
  },
  {
    name: "Chinedu Nwangwu",
    role: "Community Manager",
    linkedIn: "https://www.linkedin.com/in/chinedu-nwandu-a4689323b/",
  },
]

export default function HomePage() {
  return (
    <div className="bg-background text-foreground">
      <div className="flex flex-col pb-16 [--section-gap:clamp(1.5rem,5vw,2.5rem)] sm:[--section-gap:clamp(1.75rem,4vw,3rem)] lg:[--section-gap:clamp(2rem,3vw,3.5rem)] xl:[--section-gap:clamp(2rem,2vw,4rem)] gap-[var(--section-gap)]">
        <HomePageHeroSection />

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

        <section className="relative w-full bg-black py-16 md:py-20 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/african-students-celebrating-achievement-at-gradua.jpg"
              alt="African youth leaders"
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          </div>

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/75 z-[1]"></div>

          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/70 z-[2]"></div>

          {/* Content */}
          <div className="container relative z-10">
            <div className="flex flex-col items-center justify-center text-center text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold drop-shadow-2xl" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  10,000
                </div>
                <div className="flex flex-col items-start justify-center">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold uppercase drop-shadow-lg leading-tight"><TypeEffect text="youth" speed={150} /></div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold uppercase drop-shadow-lg leading-tight"><TypeEffect text="leaders" speed={200} /></div>
                </div>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mt-4 max-w-4xl drop-shadow-xl" style={{ color: '#ffffff' }}>
                Our vision is to identify, empower, and celebrate youth leaders across Africa by 2030.
              </p>
              <div className="w-24 h-1 bg-white/70 mx-auto rounded-full mt-6 shadow-lg"></div>
            </div>
          </div>
        </section>



        <ImpactSection />


        <section className="py-6">
          <div className="container space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold font-sans">Our Partners</h2>
              <p className="text-sm sm:text-base md:text-lg text-slate-900 mt-2 font-sans leading-relaxed tracking-wide">
                These partners amplify our mission, unlocking opportunities and resources for Africa's boldest innovators.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { name: "One Young World West & Central Africa", logo: "/3.png", alt: "One Young World West and Central Africa logo" },
                { name: "ALX Nigeria", logo: "/7.png", alt: "ALX Nigeria logo" },
                { name: "Learning Planet Institute", logo: "/6.png", alt: "Learning Planet Institute logo" },
              ].map((partner, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="w-full h-24 flex items-center justify-center mb-3">
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

        <EventsHubSection />
        <BlogSection />
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
            <div className="grid grid-cols-3 gap-2 md:gap-4 justify-center pb-4 overflow-x-hidden">
              {teamMembers.map((member) => {
                const cardContent = (
                  <>
                    <div className="relative w-full h-32 sm:h-36 md:h-48 lg:h-56 xl:h-64 overflow-hidden rounded-t-[12px] sm:rounded-t-[16px]">
                      {member.name === "Nwosu Paul Light" ? (
                        <Image
                          src="/team/Paul light.jpg.png"
                          alt={member.name}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : member.name === "Emmanuella Igboafu" ? (
                        <Image
                          src="/team/emmanuella igboafu.jpg"
                          alt={member.name}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : member.name === "Chinedu Nwangwu" || member.name === "Chinedu Daniel" ? (
                        <Image
                          src="/team/chinedu daniel.jpg.png"
                          alt={member.name}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <div className="text-3xl font-bold text-primary">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                      )}
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
                    className={`w-full rounded-[12px] sm:rounded-[16px] lg:rounded-[24px] border border-border/60 bg-card shadow-lg transition hover:-translate-y-1 hover:shadow-xl flex-shrink-0 ${member.linkedIn ? 'cursor-pointer hover:scale-[1.02]' : ''
                      }`}
                  >
                    {member.linkedIn ? (
                      <a
                        href={member.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
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

        <section id="magazine" className="py-3">
          <div className="container">
            <div className="grid gap-6 rounded-[32px] border border-border/60 bg-card p-6 sm:p-8 shadow-lg shadow-primary/10">
              <div className="space-y-4 text-center max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold leading-tight sm:text-3xl md:text-[2.25rem] lg:text-[2.5rem] font-sans">
                  Partner With Us to Empower Africa's Future Leaders
                </h2>
                <div className="space-y-4 text-sm text-slate-900 sm:text-base md:text-lg text-center inline-block font-sans leading-relaxed tracking-wide">
                  <p>Top100 connects brilliant young Africans to life-changing opportunities, scholarships, and leadership development. We're looking to collaborate with organizations that believe in supporting talent, education, and innovation across the continent.</p>
                </div>
                <div className="flex justify-center">
                  <Button asChild size="lg">
                    <Link href="/partners" className="text-base sm:text-lg flex items-center gap-2">
                      <span className="block sm:hidden">Learn more</span>
                      <span className="hidden sm:block">Learn more about partnership opportunities</span>
                      <span className="block sm:hidden">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>



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