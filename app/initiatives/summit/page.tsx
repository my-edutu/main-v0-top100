"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type AgendaItem = {
  time: string
  title: string
  description: string
}

type Speaker = {
  name: string
  role: string
  imageUrl: string
}

const whyAttend = [
  {
    title: "Immersive Learning Tracks",
    description:
      "Curated sessions led by policy shapers, founders, and faculty unpack the mindsets and skills powering next-decade leadership.",
  },
  {
    title: "High-Value Networking",
    description:
      "Meet awardees, alumni, impact funds, corporate partners, and ecosystem builders in facilitated lounges and mixers.",
  },
  {
    title: "Partner & Investor Roundtables",
    description:
      "Focused deal-flow conversations match ventures with capital, mentors, and international opportunities.",
  },
  {
    title: "Project Showcases",
    description:
      "Interactive demos spotlight climate, health, fintech, creative economy, and education projects shaping the continent.",
  },
]

const programTracks = [
  "Leadership & Policy",
  "Technology & Innovation",
  "Education & Skills",
  "Climate & Sustainability",
  "Careers & Funding",
]

const dayOneAgenda: AgendaItem[] = [
  {
    time: "09:00",
    title: "Opening Keynote",
    description: "Top100 alumni and global guests frame the future of African leadership.",
  },
  {
    time: "11:00",
    title: "Leadership & Policy Dialogues",
    description: "Interactive panels explore governance, youth inclusion, and cross-border collaboration.",
  },
  {
    time: "14:00",
    title: "Investor Roundtables",
    description: "Curated capital conversations with VCs, DFIs, angels, and corporate venture teams.",
  },
  {
    time: "17:00",
    title: "Evening Mixer",
    description: "Partners host thematic networking lounges featuring culture, tech, and city immersions.",
  },
]

const dayTwoAgenda: AgendaItem[] = [
  {
    time: "09:30",
    title: "Sector Labs",
    description: "Hands-on labs across climate tech, edtech, health innovation, and creative economy.",
  },
  {
    time: "12:30",
    title: "Awardee Showcase",
    description: "Live demos from Top100 awardees unveiling pilots, ventures, and research breakthroughs.",
  },
  {
    time: "15:00",
    title: "Mentor Huddles",
    description: "Small-group coaching with mentors, hiring partners, and advisors.",
  },
  {
    time: "17:30",
    title: "Closing Plenary",
    description: "Shared commitments, community recognitions, and roadmap launch for 2026.",
  },
]

const speakers: Speaker[] = [
  {
    name: "Ama Mensah",
    role: "Founder, Solar Leap Labs",
    imageUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Chinedu Okafor",
    role: "CEO, MedAccess Africa",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Lerato Khumalo",
    role: "Climate Strategist, GreenRoots SA",
    imageUrl: "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Omar Diallo",
    role: "Partner, Impact Ventures Collective",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Zanele Dube",
    role: "Director, STEMinist Network",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Kwame Adeyemi",
    role: "Programme Lead, Africa Catalysts",
    imageUrl: "https://images.unsplash.com/photo-1487412720507-1c0f6f9a4c83?auto=format&fit=crop&w=500&q=80",
  },
]

const teamMembers: Array<{ name: string; role: string; imageUrl: string }> = [
  {
    name: "Nwosu Paul Chibuike",
    role: "Summit Programme Lead",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Emmanuella Igboafu",
    role: "Community & Partnerships",
    imageUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Chinedu Daniel",
    role: "Operations & Experience",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
  },
]

const impactMetrics = [
  { label: "Summit Alumni", value: "1,200+" },
  { label: "Countries Represented", value: "28" },
  { label: "Partner Organisations", value: "85+" },
  { label: "Investor Meetings Hosted", value: "320+" },
]

const faqs = [
  {
    question: "Who can attend the Future Leaders Summit?",
    answer:
      "Attendance is open to Top100 awardees, alumni, invited student leaders, ecosystem partners, investors, and organisations aligned with the summit themes.",
  },
  {
    question: "Is the summit hybrid?",
    answer:
      "Yes. We combine an in-person experience in Lagos with an immersive digital platform for remote collaborators and global guests.",
  },
  {
    question: "How are showcase teams selected?",
    answer:
      "Applications are reviewed on innovation, impact, and scalability. Shortlisted teams receive mentor support and storytelling coaching ahead of the event.",
  },
  {
    question: "Are travel scholarships available?",
    answer:
      "Limited travel and accommodation grants are provided to awardees and community partners based on demonstrated need and programme alignment.",
  },
  {
    question: "Can my organisation host a session?",
    answer:
      "Absolutely. Partners can co-create labs, fireside chats, or meetups that align with summit tracks. Share your brief via the partner inquiry form.",
  },
  {
    question: "What is the registration deadline?",
    answer:
      "Priority registration closes eight weeks before the summit. Late submissions are reviewed on a rolling basis subject to capacity.",
  },
  {
    question: "Will sessions be recorded?",
    answer:
      "Keynotes and select panels will be recorded and shared with registered participants post-event. Some roundtables remain off-the-record.",
  },
  {
    question: "How can I volunteer?",
    answer:
      "Volunteers support programme production, community hospitality, and media storytelling. Complete the volunteer interest form to get started.",
  },
]

export default function FutureLeadersSummitPage() {
  return (
    <div className="bg-black text-white">
      <nav className="border-b border-white/10 bg-white/5 text-sm text-zinc-200 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-4">
          <Link
            href="/"
            className="transition hover:text-orange-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"
          >
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href="/initiatives"
            className="transition hover:text-orange-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"
          >
            Initiatives
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-zinc-400">Future Leaders Summit</span>
        </div>
      </nav>

      <main className="container mx-auto space-y-20 px-4 py-16 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-orange-400/20 bg-gradient-to-r from-black/80 via-black/60 to-zinc-900/80 p-10 shadow-lg transition hover:border-orange-400/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.15),_transparent_55%)]" />
          <div className="relative z-10 grid gap-12 lg:grid-cols-[3fr_2fr]">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.35em] text-orange-300">Top100 Initiative</p>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                🌐 Future Leaders Summit
              </h1>
              <p className="text-lg text-zinc-300 lg:text-xl">
                An immersive convening connecting awardees, partners, and investors. Designed to accelerate leadership,
                collaboration, and scalable impact across Africa’s innovation ecosystem.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="rounded-xl bg-yellow-500 px-6 py-6 text-black shadow-lg shadow-yellow-500/30 transition hover:bg-yellow-400">
                  Register Interest
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-yellow-400/70 bg-transparent px-6 py-6 text-white hover:bg-yellow-500/10"
                >
                  Become a Partner
                </Button>
              </div>
            </div>
            <div className="relative hidden h-full w-full overflow-hidden rounded-2xl border border-orange-400/30 bg-orange-500/5 lg:block">
              <Image
                src="https://images.unsplash.com/photo-1531310130191-68cd47b43721?auto=format&fit=crop&w=900&q=80"
                alt="Delegates networking at the Future Leaders Summit"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/60" />
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-10 shadow-sm">
          <h2 className="text-2xl font-semibold text-white">About the Summit</h2>
          <p className="text-lg leading-relaxed text-zinc-300">
            The Future Leaders Summit is Top100’s signature gathering where Africa’s brightest innovators, mission-driven
            organisations, and global allies co-create solutions. Across two energising days, the summit blends high-impact
            storytelling, collaborative labs, partner roundtables, and showcases that move bold ideas into action.
          </p>
        </section>

        <section className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Why Attend</h2>
            <p className="text-zinc-300">
              Built for awardees, alumni, partners, ecosystem leaders, and investors committed to unlocking Africa’s next decade.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {whyAttend.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-orange-400/20 bg-black/40 p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-lg"
              >
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-zinc-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Program Tracks</h2>
            <p className="text-zinc-300">Explore the themes anchoring the summit experience.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programTracks.map((track) => (
              <div
                key={track}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-sm transition hover:border-orange-400/40"
              >
                <h3 className="text-lg font-semibold text-white">{track}</h3>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Agenda Snapshot</h2>
            <p className="text-zinc-300">
              Two days of keynotes, labs, showcases, and curated matchmaking designed for collaboration.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {[{ label: "Day 1 · Vision & Align", slots: dayOneAgenda }, { label: "Day 2 · Build & Launch", slots: dayTwoAgenda }].map(
              (agenda) => (
                <div key={agenda.label} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-white">{agenda.label}</h3>
                  <div className="mt-6 space-y-5">
                    {agenda.slots.map((slot) => (
                      <div key={`${agenda.label}-${slot.time}`} className="rounded-2xl border border-white/10 bg-black/40 p-5">
                        <p className="text-xs uppercase tracking-[0.3em] text-orange-300">{slot.time}</p>
                        <p className="mt-2 text-lg font-semibold text-white">{slot.title}</p>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{slot.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        <section className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Speakers & Mentors</h2>
            <p className="text-zinc-300">
              Global shapers, sector leaders, and coaches committed to multiplying Top100 impact.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {speakers.map((speaker) => (
              <div
                key={speaker.name}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm transition hover:border-orange-400/40"
              >
                <div className="relative h-44 w-full overflow-hidden rounded-2xl">
                  <Image src={speaker.imageUrl} alt={speaker.name} fill className="object-cover" />
                </div>
                <div className="mt-4 space-y-1">
                  <h3 className="text-lg font-semibold text-white">{speaker.name}</h3>
                  <p className="text-sm text-orange-200">{speaker.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Meet the Summit Team</h2>
              <p className="text-zinc-300">
                The core team crafting the experiences, partnerships, and storytelling behind the Future Leaders Summit.
              </p>
            </div>
            <Button
              asChild
              className="h-fit rounded-xl bg-yellow-500 px-6 py-3 text-black hover:bg-yellow-400"
            >
              <Link href="/join">Join Top100</Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-sm transition hover:border-orange-400/40"
              >
                <div className="relative h-44 w-full overflow-hidden rounded-2xl">
                  <Image src={member.imageUrl} alt={member.name} fill className="object-cover" />
                </div>
                <div className="mt-4 space-y-1">
                  <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                  <p className="text-sm text-orange-200">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 rounded-3xl border border-orange-400/20 bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent p-8 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">For Partners & Sponsors</h2>
            <p className="text-lg text-zinc-100">
              Partner with Top100 to catalyse talent pipelines, unlock deal-flow, and seed continent-wide collaborations.
            </p>
            <ul className="space-y-3 text-sm text-zinc-100">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
                Elevated brand visibility across summit stages, digital campaigns, and press.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
                Access to a vetted talent pipeline of student founders, researchers, and industry-ready professionals.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
                Deal-flow matchmaking with high-impact teams ready to scale across the continent.
              </li>
            </ul>
            <Button variant="secondary" className="rounded-xl bg-white text-slate-900 hover:bg-slate-100">
              Download Sponsor Kit
            </Button>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-sm text-zinc-100 shadow-inner">
            <h3 className="text-lg font-semibold text-white">Partnership Windows</h3>
            <p className="mt-3">
              Opportunities range from community supporters to signature partners, with bespoke experiences including labs,
              scholarships, and city showcases.
            </p>
            <p className="mt-3">
              Share your ambitions and we&apos;ll craft an activation that aligns with your brand and impact goals.
            </p>
          </div>
        </section>

        <section className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm lg:p-10">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Showcase & Expo</h2>
            <p className="text-zinc-300">
              Awardees and partners can demo prototypes, unveil pilots, and host interactive workshops with media amplification
              and investor hours.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button className="rounded-xl bg-yellow-500 px-6 py-6 text-black shadow-yellow-500/30 hover:bg-yellow-400">
              Apply to Showcase
            </Button>
            <Button variant="outline" className="rounded-xl border-white/20 px-6 py-6 text-white hover:bg-white/10">
              View Showcase Guide
            </Button>
          </div>
        </section>

        <section className="grid gap-8 rounded-3xl border border-white/10 bg-black/40 p-8 lg:grid-cols-[2fr_3fr] lg:items-center">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Venue & Format</h2>
            <p className="text-zinc-300">
              Hosted in Lagos, Nigeria at the Landmark Centre with hybrid-ready production, the summit pairs immersive on-ground
              experiences with a robust virtual platform for the global Top100 community.
            </p>
            <p className="text-zinc-300">
              In-person delegates receive curated city guides, partner site visits, and community dinners; virtual participants enjoy
              live-streamed keynotes, digital roundtables, and replay access.
            </p>
          </div>
          <div className="relative h-64 w-full overflow-hidden rounded-3xl border border-white/10">
            <Image
              src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80"
              alt="Summit venue overview"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/70" />
          </div>
        </section>

        <section className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Impact Metrics</h2>
            <p className="text-zinc-300">Highlights from previous summit editions and community engagements.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {impactMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-white/10 bg-black/40 p-6 text-center shadow-sm transition hover:border-orange-400/40 hover:shadow-lg"
              >
                <p className="text-3xl font-bold text-orange-300 lg:text-4xl">{metric.value}</p>
                <p className="mt-2 text-sm text-zinc-300">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm lg:p-10">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Frequently Asked Questions</h2>
            <p className="text-zinc-300">
              Everything you need to know about participating, partnering, or showcasing at the summit.
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`faq-${index}`}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition hover:border-orange-400/30"
              >
                <AccordionTrigger className="px-6 py-4 text-left text-base font-semibold text-white hover:text-orange-300">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5 text-sm text-zinc-300">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="rounded-3xl border border-orange-400/20 bg-gradient-to-r from-orange-500/30 via-orange-500/10 to-transparent p-10 text-center shadow-lg">
          <h2 className="text-3xl font-semibold text-white">Be Part of the Future Leaders Summit Experience</h2>
          <p className="mt-4 text-lg text-orange-100">
            Join us in co-creating a gathering that accelerates Africa&apos;s next generation of changemakers.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button className="rounded-xl bg-white text-slate-900 hover:bg-slate-100">Register Interest</Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/40 bg-transparent px-6 py-6 text-white hover:bg-white/10"
            >
              Become a Partner
            </Button>
            <Button className="rounded-xl bg-yellow-500 px-6 py-6 text-black hover:bg-yellow-400">Volunteer</Button>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm lg:p-12">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <h2 className="text-2xl font-semibold text-white">Stay in the Loop</h2>
            <p className="text-zinc-300">
              Subscribe for summit updates, speaker announcements, and curated opportunities for emerging leaders.
            </p>
            <form
              className="flex flex-col gap-4 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault()
              }}
            >
              <Input
                type="email"
                required
                placeholder="Enter your email"
                className="flex-1 rounded-xl border-white/20 bg-black/40 text-white placeholder:text-zinc-400 focus-visible:ring-orange-400"
              />
              <Button type="submit" className="rounded-xl bg-yellow-500 px-6 py-6 text-black hover:bg-yellow-400">
                Subscribe
              </Button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
