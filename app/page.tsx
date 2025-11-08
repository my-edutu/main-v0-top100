import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import HomePageHeroSection from "./components/HomePageHeroSection"
import AwardeesSection from "./components/AwardeesSection"
import HomeFeaturedAwardeesSection from "./components/HomeFeaturedAwardeesSection"
import BlogSection from "./components/BlogSection"
import MagazineSection from "./components/MagazineSection"
import RecentEventsSection from "./components/RecentEventsSection"
import ImpactSection from "./components/ImpactSection"
import InitiativeCards from "@/components/InitiativeCards"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type Initiative = {
  title: string
  description: string
  href: string
}

type FAQ = {
  question: string
  answer: string
}

type TeamMember = {
  name: string
  role: string
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

const faqs: FAQ[] = [
  {
    question: "What is Top100 Africa Future Leaders?",
    answer:
      "Top100 Africa Future Leaders is a youth-driven movement that identifies, celebrates, and empowers Africa's brightest young leaders.",
  },
  {
    question: "When did it start?",
    answer:
      "The initiative started in 2023 and officially launched its first continental summit in 2024, profiling 400+ outstanding students and leaders across Africa.",
  },
  {
    question: "What makes Top100 unique?",
    answer:
      "Unlike traditional awards, Top100 is a community. Awardees join a lifelong network gaining visibility, mentorship, and access to global opportunities.",
  },
  {
    question: "What happened at the 2024 Africa Future Leaders Empowerment Summit?",
    answer:
      "The 2024 Summit brought hundreds of students, professionals, and partners together under the theme ‘Empowering Africa's Future Leaders’.",
  },
  {
    question: "Who can be part of Top100?",
    answer:
      "We welcome awardees, volunteers, partners, and donors aligned with youth empowerment and community impact.",
  },
  {
    question: "How are awardees selected?",
    answer:
      "Awardees are nominated and assessed on academic excellence, leadership, community contribution, and their potential for impact.",
  },
]

const teamMembers: TeamMember[] = [
  {
    name: "Nwosu Paul Light",
    role: "Founder",
  },
  {
    name: "Emmanuella Igboafu",
    role: "Team Lead",
  },
  {
    name: "Chinedu Daniel",
    role: "Team Lead",
  },
]

export default function HomePage() {
  return (
    <div className="bg-background text-foreground">
      <div className="flex flex-col pb-16 [--section-gap:clamp(1.5rem,5vw,2.5rem)] sm:[--section-gap:clamp(1.75rem,4vw,3rem)] lg:[--section-gap:clamp(2rem,3vw,3.5rem)] xl:[--section-gap:clamp(2rem,2vw,4rem)] gap-[var(--section-gap)]">
        <HomePageHeroSection />

        <section className="py-8">
          <div className="container space-y-6">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-3xl font-semibold">About the movement</h2>
              <div className="space-y-4 text-lg text-slate-900">
                <p>
                  We celebrate undergraduates rewriting what leadership looks like across the continent. From Lagos to Kigali, our awardees transform bold ideas into movements that uplift communities and open doors for their peers.
                </p>
                <p>
                  Each cohort receives mentorship, global exposure, funding pathways, and storytelling support—because every breakthrough deserves a platform and a community to sustain it.
                </p>
              </div>
              <div className="pt-4">
                <Button asChild>
                  <Link href="/africa-future-leaders">Explore our story</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>



        <ImpactSection />


        <section className="py-8">
          <div className="container space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-semibold">Meet some of our sponsors</h2>
              <p className="text-sm text-slate-900 sm:text-base mt-2">
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
                    <img 
                      src={partner.logo} 
                      alt={partner.alt} 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="text-center text-sm font-medium">{partner.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="initiatives" className="py-8">
          <div className="container space-y-6 sm:space-y-8">
            <div>
              <h2 className="text-3xl font-semibold">Our latest initiatives</h2>
              <p className="text-sm text-slate-900 sm:text-base">
                Each initiative unlocks mentorship, funding, and opportunities tailored for Africa&apos;s youth.
              </p>
            </div>
            <InitiativeCards />
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/initiatives">Explore all initiatives</Link>
              </Button>
            </div>
          </div>
        </section>

        <BlogSection />
        <HomeFeaturedAwardeesSection />
        <MagazineSection />
        <RecentEventsSection />

        <section className="py-8">
          <div className="container space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold">
                Meet the people behind the platform
              </h2>
              <p className="text-sm text-slate-900 sm:text-base">
                Programme leads, storytellers, and community builders sustaining the Top100 movement.
              </p>
            </div>
            <div className="flex gap-6 sm:gap-7 overflow-x-auto pb-4 -mx-4 px-4">
              {teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="flex-shrink-0 w-64 rounded-[28px] border border-border/60 bg-card shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative w-full h-48 overflow-hidden rounded-t-[28px]">
                    {member.name === "Nwosu Paul Light" ? (
                      <Image 
                        src="/team/Paul light.jpg.png" 
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : member.name === "Emmanuella Igboafu" ? (
                      <Image 
                        src="/team/emmanuella igboafu.jpg" 
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : member.name === "Chinedu Daniel" ? (
                      <Image 
                        src="/team/chinedu daniel.jpg.png" 
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <div className="text-4xl font-bold text-primary">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="text-lg font-bold">{member.name}</h3>
                    <p className="text-sm uppercase tracking-[0.15em] text-slate-900">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="magazine" className="py-8">
          <div className="container">
            <div className="grid gap-6 rounded-[32px] border border-border/60 bg-card p-6 sm:p-8 shadow-lg shadow-primary/10">
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold leading-tight sm:text-[2.25rem]">
                  Partner with us to unlock bespoke programmes and future-forward experiences.
                </h2>
                <ul className="space-y-2 text-sm text-slate-900 sm:text-base">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    Showcase your organisation alongside Africa&apos;s brightest young innovators.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    Co-create mentorship, internship, or venture pipelines tailored to your goals.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    Invest in catalytic gatherings such as Talk100 Live and the Future Leaders Summit.
                  </li>
                </ul>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/join">Partner with us</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="container space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-semibold">Africa Future Leaders Summit 2026</h2>
              <p className="mt-4 text-lg text-slate-900">
                Join us in co-creating a gathering that accelerates Africa&apos;s next generation of changemakers.
              </p>
            </div>
            <div className="flex justify-center">
              <Button asChild className="bg-yellow-500 text-black hover:bg-yellow-400">
                <Link href="/initiatives/summit">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="faq" className="py-8">
          <div className="container space-y-6 sm:space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold">Frequently asked questions</h2>
              <p className="text-sm text-slate-900 sm:text-base">
                Answers for nominees, partners, and community members curious about the journey ahead.
              </p>
            </div>
            <Accordion type="single" collapsible className="space-y-5">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${index}`}
                  className="overflow-hidden rounded-[24px] border border-border/60 bg-card/95 shadow-sm transition-all hover:border-primary/60 data-[state=open]:border-primary/60"
                >
                  <AccordionTrigger className="px-6 py-4 text-left text-base font-semibold hover:text-primary data-[state=open]:text-primary transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-sm text-slate-900">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section id="contact" className="py-8">
          <div className="container">
            <div className="rounded-[32px] border border-border/60 bg-gradient-to-br from-orange-50 to-amber-50 p-6 sm:p-8 lg:p-10 shadow-lg shadow-primary/10">
              <div className="space-y-6 sm:space-y-7">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Stay in the loop</h2>
                  <p className="text-sm text-slate-900">
                    Get monthly highlights on awardees, opportunities, and events delivered straight to your inbox.
                  </p>
                </div>
                <form
                  className="flex flex-col gap-4 sm:flex-row"
                  action="#"
                >
                  <div className="relative flex-1">
                    <Input
                      type="email"
                      placeholder="Email address"
                      className="w-full rounded-2xl border-0 bg-white py-6 pl-6 pr-32 shadow-sm shadow-black/5 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-0"
                      required
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-white rounded-xl px-4 py-2 text-sm font-medium">
                      Subscribe
                    </div>
                  </div>
                </form>
                <p className="text-xs text-slate-900">
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
