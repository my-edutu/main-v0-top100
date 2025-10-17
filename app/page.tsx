"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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

type Story = {
  title: string
  excerpt: string
  tags: string[]
  href: string
  imageUrl: string
}

type Initiative = {
  title: string
  description: string
  href: string
}

type Statistic = {
  value: string
  label: string
  description: string
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

const featuredStories: Story[] = [
  {
    title: "How Project100 Scholars Are Building Resilient Communities",
    excerpt: "Four scholars share the community-led innovations that are reshaping access to education and healthcare.",
    tags: ["Impact", "Community"],
    href: "/blog/project100-resilience",
    imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Inside Talk100 Live: Conversations that Spark Policy Shifts",
    excerpt: "Highlights from our latest Talk100 Live session with young policymakers driving change across the continent.",
    tags: ["Leadership", "Policy"],
    href: "/blog/talk100-live-highlights",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Designing the Future Leaders Summit Experience",
    excerpt: "Behind the scenes with the curators building immersive learning journeys for young innovators.",
    tags: ["Summit", "Innovation"],
    href: "/blog/future-leaders-summit",
    imageUrl: "https://images.unsplash.com/photo-1515165562835-c4c7e1d19f3c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Funding the Next Generation of African Founders",
    excerpt: "A new opportunities hub is connecting youth-led ventures to capital, mentorship, and global partners.",
    tags: ["Opportunities", "Entrepreneurship"],
    href: "/blog/opportunities-hub-launch",
    imageUrl: "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Breaking Barriers: Women in Tech Across Africa",
    excerpt: "The inspiring journey of four women who've overcome challenges to lead innovation in their communities.",
    tags: ["Innovation", "Women in Tech"],
    href: "/blog/women-in-tech-across-africa",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Climate Action Champions: The 2024 Awardees",
    excerpt: "Meet the young climate leaders whose projects are driving sustainable development across the continent.",
    tags: ["Climate", "Sustainability"],
    href: "/blog/climate-action-champions",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
  },
]

const awardeeHighlights: Awardee[] = [
  {
    name: "Awa Traore",
    achievement: "Launched a digital literacy academy for girls.",
    country: "Mali",
    headline: "Coding confidence for thousands",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Kofi Boateng",
    achievement: "Co-founded an affordable agri-tech sensor network.",
    country: "Ghana",
    headline: "Smart farms, thriving harvests",
    imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Zanele Dube",
    achievement: "Runs a pan-African mentorship exchange for girls in STEM.",
    country: "South Africa",
    headline: "Mentorship without borders",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Omar Diallo",
    achievement: "Engineered AI tools for early crop disease detection.",
    country: "Senegal",
    headline: "Predicting harvest health",
    imageUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Nadia Benkirane",
    achievement: "Built a cross-border microfinance network for women entrepreneurs.",
    country: "Morocco",
    headline: "Catalyzing inclusive finance",
    imageUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Tendai Chirwa",
    achievement: "Developed a mental health playbook for universities.",
    country: "Malawi",
    headline: "Campus wellbeing rebooted",
    imageUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=600&q=80",
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

const statistics: Statistic[] = [
  {
    value: "31+",
    label: "Countries",
    description: "Across the African continent",
  },
  {
    value: "97,000",
    label: "Lives impacted",
    description: "Stories of students inspiring their communities",
  },
  {
    value: "400+",
    label: "Awardees",
    description: "Future leaders recognized since launch",
  },
  {
    value: "3",
    label: "Global partners",
    description: "Strategic collaborations powering the movement",
  },
]

const faqs: FAQ[] = [
  {
    question: "Who can be nominated for Top100 Africa Future Leaders?",
    answer:
      "We celebrate undergraduate students in African universities who are demonstrating outstanding leadership, innovation, or community impact across any discipline.",
  },
  {
    question: "How does the programme support selected awardees?",
    answer:
      "Awardees join a continent-wide network, receive mentorship, gain visibility through our storytelling platforms, and access opportunities that accelerate their initiatives.",
  },
  {
    question: "Can organisations collaborate with Top100?",
    answer:
      "Yes. We craft bespoke partnerships for organisations that want to co-create scholarships, mentorship programmes, internships, or youth-focused events.",
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

const StatsMarqueeStyle = () => (
  <style jsx global>{`
    @keyframes stats-marquee-horizontal {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(-50%);
      }
    }

    .animate-stats-marquee-horizontal {
      display: flex;
      animation: stats-marquee-horizontal 24s linear infinite;
    }

    .animate-stats-marquee-horizontal:hover {
      animation-play-state: paused;
    }
  `}</style>
)

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
    <div className="bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white">
      <StatsMarqueeStyle />
      <div className="container mx-auto px-4 lg:px-8 py-16 space-y-20">
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 shadow-sm">
          <div className="absolute inset-0 lg:hidden">
            <Image
              src={activeAwardee.imageUrl}
              alt={activeAwardee.name}
              fill
              className="object-cover blur-[6px] scale-110"
              priority
            />
            <div className="absolute inset-0 bg-black/70" />
          </div>

          <div className="relative grid gap-10 lg:grid-cols-[3fr_2fr]">
            <div className="p-8 sm:p-12 flex flex-col justify-center space-y-6">
              <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
                {activeAwardee.country} · {activeAwardee.name}
              </p>
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  {activeAwardee.headline}
                </h1>
                <p className="text-lg text-zinc-300">
                  {activeAwardee.achievement}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-orange-500 text-black hover:bg-orange-400 px-6 py-6 rounded-xl">
                  <Link href="/awardees">Explore Awardees</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800 px-6 py-6 rounded-xl"
                >
                  <Link href="/blog">Read Stories</Link>
                </Button>
              </div>
              <div className="flex space-x-2 pt-2">
                {heroAwardees.map((awardee, index) => (
                  <button
                    key={awardee.name}
                    onClick={() => setCurrentHeroIndex(index)}
                    className={`h-2.5 w-10 rounded-full transition-all ${
                      currentHeroIndex === index ? "bg-orange-400" : "bg-zinc-700 hover:bg-zinc-600"
                    }`}
                    aria-label={`Show ${awardee.name}`}
                  />
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <Image src={activeAwardee.imageUrl} alt={activeAwardee.name} fill className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </div>
          </div>
        </section>

        <section
          id="about"
          className="rounded-3xl border border-zinc-800 bg-zinc-900/40 shadow-sm p-8 sm:p-12 space-y-6"
        >
          <div className="max-w-4xl space-y-4">
            <h2 className="text-2xl sm:text-3xl font-semibold">Top100 Africa Future Leaders</h2>
            <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
              Top100 Africa Future Leaders celebrates undergraduates rewriting what leadership looks like on the
              continent. We spotlight students whose ideas uplift communities, unlock opportunity, and challenge the
              status quo.
            </p>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              From mentorship and global exposure to funding pathways and storytelling support, every cohort receives the
              resources they need to transform campus-born projects into scalable solutions.
            </p>
          </div>
          <Button asChild className="bg-orange-500 text-black hover:bg-orange-400 px-6 py-6 rounded-xl w-full sm:w-auto">
            <Link href="/africa-future-leaders">Read more</Link>
          </Button>
        </section>

        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold">Impact at a glance</h2>
              <p className="text-zinc-400 text-base sm:text-lg">
                Highlights from the Top100 network, inspired by our Africa Future Leaders showcase.
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-orange-400/15 bg-zinc-900/40 py-6">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950 via-zinc-950/70 to-transparent" />
            <div className="overflow-hidden px-4 sm:px-6">
              <div className="flex animate-stats-marquee-horizontal gap-4 sm:gap-6">
                {[...statistics, ...statistics].map((stat, index) => (
                  <div
                    key={`${stat.label}-${index}`}
                    className="flex h-48 w-[210px] flex-col justify-between rounded-2xl border border-orange-400/20 bg-black/50 px-5 py-5 shadow-md backdrop-blur-lg transition hover:border-orange-400/50 hover:shadow-orange-500/10 sm:h-52 sm:w-[240px]"
                  >
                    <div className="text-2xl font-semibold text-orange-300 sm:text-3xl">{stat.value}</div>
                    <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-zinc-200 sm:text-xs">
                      {stat.label}
                    </div>
                    <p className="mt-4 text-xs text-zinc-400 leading-relaxed sm:text-sm">{stat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold">Featured Stories</h2>
              <p className="text-zinc-400 text-base sm:text-lg">
                Follow the journeys of young leaders reshaping Africa&apos;s future.
              </p>
            </div>
            <Button asChild variant="ghost" className="text-orange-300 hover:text-orange-200 hover:bg-orange-500/10">
              <Link href="/blog">Browse all stories</Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredStories.slice(0, 6).map((story) => (
              <Link
                key={story.title}
                href={story.href}
                className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm transition hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-lg overflow-hidden"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <Image src={story.imageUrl} alt={story.title} fill className="object-cover transition group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {story.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-orange-400/30 text-orange-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="text-xl font-semibold group-hover:text-orange-300 transition">{story.title}</h3>
                  <p className="mt-3 text-sm text-zinc-400 leading-relaxed flex-1">{story.excerpt}</p>
                  <span className="mt-5 inline-flex items-center text-sm font-medium text-orange-300">
                    Read more &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold">Awardee Highlights</h2>
            <p className="text-zinc-400 text-base sm:text-lg">
              Meet the changemakers leading impact in communities across Africa.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {awardeeHighlights.map((awardee) => (
              <div
                key={awardee.name}
                className="flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm transition hover:border-orange-400/30"
              >
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                  <Image src={awardee.imageUrl} alt={awardee.name} fill className="object-cover" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{awardee.name}</h3>
                    <span className="text-xs uppercase tracking-widest text-orange-300">{awardee.country}</span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-snug">{awardee.headline}</p>
                  <p className="text-xs text-zinc-500 leading-snug">{awardee.achievement}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            asChild
            className="font-bold bg-orange-500 text-black hover:bg-orange-400 w-full sm:w-auto px-6 py-6 rounded-xl"
          >
            <Link href="/awardees">View all awardees</Link>
          </Button>
        </section>

        <section className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold">Meet the Team</h2>
              <p className="text-zinc-400 text-base sm:text-lg">
                The people championing the Top100 movement across programmes, partners, and storytelling.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-sm transition hover:border-orange-400/30"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-orange-500/20 text-2xl font-semibold text-orange-200">
                  {member.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                  <p className="text-sm uppercase tracking-[0.25em] text-orange-300">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="magazine" className="rounded-3xl border border-orange-400/20 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-black p-8 sm:p-12 shadow-sm">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-semibold text-orange-200">Partner with us</h2>
              <p className="text-zinc-200 text-base sm:text-lg leading-relaxed">
                Collaborate with Top100 to unlock bespoke programmes, scholarships, and experiences that elevate Africa&apos;s next generation of leaders.
              </p>
              <ul className="space-y-3 text-sm text-orange-100/80 leading-relaxed">
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-300" />
                  <span>Showcase your organisation alongside Africa&apos;s brightest young innovators.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-300" />
                  <span>Co-create mentorship, internship, or venture support pipelines tailored to your goals.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-300" />
                  <span>Invest in catalytic events such as Talk100 Live and the Future Leaders Summit.</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-orange-400/20 bg-black/40 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-orange-200">Let&apos;s build something bold</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Share your partnership idea and we&apos;ll connect you with the team crafting collaborations across the continent.
              </p>
              <div className="space-y-3 text-sm text-zinc-400">
                <p>Email: partnerships@top100africa.com</p>
                <p>WhatsApp: +234 812 345 6789</p>
              </div>
              <Button asChild className="bg-orange-500 text-black hover:bg-orange-400 px-6 py-6 rounded-xl">
                <Link href="/join">Partner with us</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="initiatives" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold">Initiatives</h2>
              <p className="text-zinc-400 text-base sm:text-lg">
                Dive into the programmes powering the Top100 Africa Future Leaders movement.
              </p>
            </div>
            <Button asChild variant="ghost" className="text-orange-300 hover:text-orange-200 hover:bg-orange-500/10">
              <Link href="/initiatives">Explore all initiatives</Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {initiatives.map((initiative) => (
              <Link
                key={initiative.title}
                href={initiative.href}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-lg"
              >
                <h3 className="text-xl font-semibold group-hover:text-orange-300 transition">
                  {initiative.title}
                </h3>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                  {initiative.description}
                </p>
                <span className="mt-5 inline-flex items-center text-sm font-medium text-orange-300">
                  Learn more &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section id="faq" className="space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold">Frequently Asked Questions</h2>
            <p className="text-zinc-400 text-base sm:text-lg">
              Answers to the questions we hear most from nominees, partners, and supporters.
            </p>
          </div>
          <Accordion
            type="single"
            collapsible
            className="space-y-4"
          >
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`faq-${index}`}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm transition hover:border-orange-400/30"
              >
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold text-white hover:text-orange-300 data-[state=open]:text-orange-300">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5">
                  <p className="text-sm text-zinc-300 leading-relaxed">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section
          id="contact"
          className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-black to-zinc-900 p-10 shadow-sm"
        >
          <div className="max-w-3xl space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold">Stay in the loop</h2>
              <p className="text-zinc-400 text-lg">
                Subscribe for monthly updates on awardees, events, and opportunities.
              </p>
            </div>
            <form
              className="flex flex-col sm:flex-row gap-4"
              onSubmit={(event) => {
                event.preventDefault()
              }}
            >
              <Input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 rounded-xl border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500"
                required
              />
              <Button type="submit" className="rounded-xl bg-orange-500 px-6 py-6 text-black hover:bg-orange-400">
                Subscribe
              </Button>
            </form>
            <p className="text-xs text-zinc-500">
              We respect your inbox. Expect one email per month with curated highlights.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
