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
import NewsletterForm from "./components/NewsletterForm"
import TypeEffect from "@/components/TypeEffect"
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

const faqs: FAQ[] = [
  {
    question: "What is Top100 Africa Future Leaders?",
    answer:
      "Top100 Africa Future Leaders is a continental initiative dedicated to identifying, celebrating, and empowering Africa's brightest young leaders. We spotlight exceptional students and youth driving innovation, leadership, and social impact across Africa.",
  },
  {
    question: "What is the mission of Top100?",
    answer:
      "Our mission is to build a generation of purpose-driven African leaders by providing access to opportunities, mentorship, and exposure through our leadership network, empowerment summits, and digital platforms.",
  },
  {
    question: "Who founded Top100 Africa Future Leaders?",
    answer:
      "Top100 was founded by Nwosu Paul Light, a youth leader and innovator passionate about education, leadership, and technology in Africa. He envisions a connected ecosystem that discovers and empowers young Africans shaping the continent's future.",
  },
  {
    question: "Is Top100 a registered organization?",
    answer:
      "Yes. Top100 is in the process of being registered as an NGO with the Corporate Affairs Commission (CAC) in Nigeria, with expansion plans to partner with youth organizations, universities, and government agencies across Africa.",
  },
  {
    question: "What is the Africa Future Leaders Summit?",
    answer:
      "The Africa Future Leaders Empowerment Summit is our flagship annual event that brings together young leaders, innovators, and changemakers across Africa for two days of virtual and physical sessions. The summit features keynote speakers, leadership panels, skill workshops, and networking sessions — all themed around 'Empowering Africa's Future Leaders.'",
  },
  {
    question: "Who are the speakers at the Summit?",
    answer:
      "Each year, we invite a diverse lineup of speakers — from global youth advocates to successful entrepreneurs and scholarship recipients — who inspire participants with real-life stories and actionable insights. (Speaker list is updated yearly on our website.)",
  },
  {
    question: "What is the Top100 Leadership Network?",
    answer:
      "The Top100 Leadership Network is our alumni and partnership community that connects past Top100 awardees, student leaders, and emerging professionals for peer mentorship, collaborations, and exclusive access to leadership resources.",
  },
  {
    question: "What is the Project100 Scholarship Initiative?",
    answer:
      "The Project100 Scholarship is a scholarship-verification and mentorship initiative designed to help students access verified funding opportunities. It also interviews past scholarship recipients to share their success stories and inspire others.",
  },
  {
    question: "Who can apply to be part of Top100 Africa Future Leaders?",
    answer:
      "Applications are open to graduates, and young professionals between 18–35 years old across Africa who have demonstrated leadership, innovation, or social impact in their communities, schools, or workplaces.",
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
    name: "Chinedu Daniel",
    role: "Team Lead",
    linkedIn: "https://www.linkedin.com/in/chinedu-nwandu-a4689323b/",
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
                  We celebrate Africa's high-achieving youth leaders — from first-class graduates to innovators, changemakers, and student leaders — who are redefining what leadership looks like across the continent. From Lagos to Kigali, our awardees turn bold ideas into movements that uplift communities and create opportunities for their peers.
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
                <div className="text-6xl md:text-7xl lg:text-8xl font-extrabold drop-shadow-2xl">
                  <TypeEffect text="10,000" speed={100} />
                </div>
                <div className="flex flex-col items-start justify-center">
                  <div className="text-lg md:text-xl font-bold uppercase drop-shadow-lg leading-tight"><TypeEffect text="youth" speed={150} /></div>
                  <div className="text-lg md:text-xl font-bold uppercase drop-shadow-lg leading-tight"><TypeEffect text="leaders" speed={200} /></div>
                </div>
              </div>
              <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-4 max-w-4xl drop-shadow-xl" style={{ color: '#ffffff' }}>
                our vision is to identify, empower, and celebrate youth leaders across Africa by 2030.
              </p>
              <div className="w-24 h-1 bg-white/70 mx-auto rounded-full mt-6 shadow-lg"></div>
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
                    <Image
                      src={partner.logo}
                      alt={partner.alt}
                      width={100}
                      height={40}
                      className="max-h-full max-w-full object-contain"
                      priority={index < 2} // Prioritize loading of first two sponsors
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
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-semibold md:text-4xl">
                Meet the people behind the platform
              </h2>
              <p className="text-base text-slate-900 sm:text-lg">
                Programme leads, storytellers, and community builders sustaining the Top100 movement.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 justify-items-center overflow-x-auto pb-4 -mx-4 px-4">
              {teamMembers.map((member) => {
                const cardContent = (
                  <>
                    <div className="relative w-full h-28 sm:h-32 overflow-hidden rounded-t-[18px] sm:rounded-t-[20px]">
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
                          <div className="text-3xl font-bold text-primary">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 sm:p-3 space-y-1">
                      <h3 className="text-sm sm:text-base font-bold line-clamp-2">{member.name}</h3>
                      <p className="text-[0.6rem] sm:text-xs uppercase tracking-[0.05em] text-slate-900">{member.role}</p>
                    </div>
                  </>
                );

                return (
                  <div
                    key={member.name}
                    className={`w-full max-w-[180px] sm:max-w-[200px] rounded-[18px] sm:rounded-[20px] border border-border/60 bg-card shadow-lg transition hover:-translate-y-1 hover:shadow-xl flex-shrink-0 ${
                      member.linkedIn ? 'cursor-pointer hover:scale-[1.02]' : ''
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

        <section id="magazine" className="py-8">
          <div className="container">
            <div className="grid gap-6 rounded-[32px] border border-border/60 bg-card p-6 sm:p-8 shadow-lg shadow-primary/10">
              <div className="space-y-4 text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-semibold leading-tight sm:text-[2.25rem]">
                  Partner with us to unlock bespoke programmes and future-forward experiences.
                </h2>
                <ul className="space-y-2 text-sm text-slate-900 sm:text-base text-left inline-block">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
                    Showcase your organisation alongside Africa&apos;s brightest young innovators.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
                    Co-create mentorship, internship, or venture pipelines tailored to your goals.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
                    Invest in catalytic gatherings such as Talk100 Live and the Future Leaders Summit.
                  </li>
                </ul>
                <div className="flex justify-center">
                  <Button asChild size="lg">
                    <Link href="/join">Partner with us</Link>
                  </Button>
                </div>
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
                <NewsletterForm />
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