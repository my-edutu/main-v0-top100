"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AwardeesSection from "./components/AwardeesSection"
import BlogSection from "./components/BlogSection"
import MagazineSection from "./components/MagazineSection"
import RecentEventsSection from "./components/RecentEventsSection"
import ImpactSection from "./components/ImpactSection"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type Awardee = {
  name: string
  achievement: string
  country: string
  headline: string
  imageUrl: string
}

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

const heroAwardees: Awardee[] = [
  {
    name: "Ama Mensah",
    achievement: "Founded a solar-powered learning hub reaching 50 rural schools in Ghana.",
    country: "Ghana",
    headline: "Lighting the path for future scientists",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Chinedu Okafor",
    achievement: "Built a telehealth platform that connects 200+ doctors to remote communities.",
    country: "Nigeria",
    headline: "Reimagining access to healthcare",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Lerato Khumalo",
    achievement: "Scaled youth-led climate action projects to 12 cities across Southern Africa.",
    country: "South Africa",
    headline: "Mobilizing a green vanguard",
    imageUrl: "https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=1200&q=80",
  },
]

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
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroAwardees.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [])

  const activeAwardee = heroAwardees[currentHeroIndex]

  return (
    <div className="bg-background text-foreground">
      <div className="space-y-8 pb-24 pt-8 sm:space-y-12 sm:pt-10 md:space-y-14 md:pt-12 lg:space-y-20 lg:pt-16">
        <motion.section
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="container">
            <div className="overflow-hidden rounded-[32px] border border-border/60 bg-card/95 shadow-xl shadow-primary/10 backdrop-blur-xl">
              <div className="grid gap-6 px-6 py-7 sm:gap-8 sm:px-8 sm:py-9 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-primary">
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                    <span>{activeAwardee.country}</span>
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                      {activeAwardee.headline}
                    </h1>
                    <p className="text-base text-muted-foreground sm:text-lg">
                      {activeAwardee.achievement}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="bg-orange-500 text-black hover:bg-orange-400">
                      <Link href="/awardees">Explore awardees</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black">
                      <Link href="/blog">Read stories</Link>
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {heroAwardees.map((awardee, index) => (
                      <button
                        key={awardee.name}
                        onClick={() => setCurrentHeroIndex(index)}
                        className={cn(
                          "h-2.5 w-10 rounded-full transition-all",
                          currentHeroIndex === index
                            ? "bg-primary"
                            : "bg-muted hover:bg-primary/40",
                        )}
                        aria-label={`Show ${awardee.name}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-[28px] bg-surface/70">
                  <Image
                    src={activeAwardee.imageUrl}
                    alt={activeAwardee.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(0,0,0,0.7))]" />
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/30 bg-background/80 p-4 text-sm shadow-lg shadow-primary/10">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Featured awardee</p>
                    <p className="mt-2 text-base font-semibold">{activeAwardee.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section id="about">
          <div className="container">
            <div className="rounded-[32px] border border-border/70 bg-surface p-8 shadow-sm sm:p-10">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                    About the movement
                  </p>
                  <h2 className="text-3xl font-semibold leading-tight sm:text-[2.5rem]">
                    Top100 Africa Future Leaders
                  </h2>
                </div>
                <div className="space-y-4 text-base text-muted-foreground sm:text-lg">
                  <p>
                    We celebrate undergraduates rewriting what leadership looks like across the continent. From Lagos to
                    Kigali, our awardees transform bold ideas into movements that uplift communities and open doors for
                    their peers.
                  </p>
                  <p>
                    Each cohort receives mentorship, global exposure, funding pathways, and storytelling support—because
                    every breakthrough deserves a platform and a community to sustain it.
                  </p>
                </div>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/africa-future-leaders">Explore our story</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <ImpactSection />

        <section id="initiatives">
          <div className="container space-y-6">
            <div>
              <h2 className="text-3xl font-semibold">Our latest initiatives</h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Each initiative unlocks mentorship, funding, and opportunities tailored for Africa&apos;s youth.
              </p>
            </div>
            <div className="flex flex-col gap-6">
              {initiatives.map((initiative) => (
                <Link
                  key={initiative.title}
                  href={initiative.href}
                  className={`group rounded-[28px] border border-transparent p-1 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 ${
                    initiative.title === "Project100 Scholarship" 
                      ? "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30" 
                      : initiative.title === "Talk100 Live" 
                      ? "bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/30" 
                      : initiative.title === "Future Leaders Summit" 
                      ? "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30" 
                      : "bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30"
                  }`}
                >
                  <div className="p-5 rounded-[27px] bg-white/80 dark:bg-background/80 h-full flex flex-col">
                    <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                      {initiative.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground flex-grow">
                      {initiative.description}
                    </p>
                    <div className="mt-4 flex justify-end">
                      <div className="rounded-full bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/initiatives">Explore all initiatives</Link>
              </Button>
            </div>
          </div>
        </section>

        <BlogSection />
        <AwardeesSection />
        <MagazineSection />
        <RecentEventsSection />

        <section>
          <div className="container space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold">
                Meet the people behind the platform
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Programme leads, storytellers, and community builders sustaining the Top100 movement.
              </p>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4">
              {teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="flex-shrink-0 w-64 rounded-[28px] border border-border/60 bg-card shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-48 overflow-hidden rounded-t-[28px]">
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <div className="text-4xl font-bold text-primary">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="text-lg font-bold">{member.name}</h3>
                    <p className="text-sm uppercase tracking-[0.15em] text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="magazine">
          <div className="container">
            <div className="grid gap-8 rounded-[32px] border border-border/60 bg-card p-8 shadow-lg shadow-primary/10">
              <div className="space-y-5">
                <h2 className="text-3xl font-semibold leading-tight sm:text-[2.25rem]">
                  Partner with us to unlock bespoke programmes and future-forward experiences.
                </h2>
                <ul className="space-y-3 text-sm text-muted-foreground sm:text-base">
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

        <section id="faq">
          <div className="container space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold">Frequently asked questions</h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Answers for nominees, partners, and community members curious about the journey ahead.
              </p>
            </div>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${index}`}
                  className="overflow-hidden rounded-[24px] border border-border/60 bg-card/95 shadow-sm transition-all hover:border-primary/60 data-[state=open]:border-primary/60"
                >
                  <AccordionTrigger className="px-6 py-4 text-left text-base font-semibold hover:text-primary data-[state=open]:text-primary transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section id="contact">
          <div className="container">
            <div className="rounded-[32px] border border-border/60 bg-gradient-to-br from-orange-50 to-amber-50 p-8 shadow-lg shadow-primary/10 sm:p-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Stay in the loop</h2>
                  <p className="text-sm text-muted-foreground">
                    Get monthly highlights on awardees, opportunities, and events delivered straight to your inbox.
                  </p>
                </div>
                <form
                  className="flex flex-col gap-4 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault()
                  }}
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
                <p className="text-xs text-muted-foreground">
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
