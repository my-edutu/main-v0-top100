"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Gallery from "@/components/Gallery"
import AboutSection from "@/app/components/AboutSection"
import GallerySection from "@/app/components/GallerySection"
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
    title: "Who Are Africa's Future Leaders?",
    description: "",
  },
  {
    time: "10:00",
    title: "The 3 I's of Leadership – Impact, Influence, and Intellectualism",
    description: "",
  },
  {
    time: "11:00",
    title: "Crafting a Personal Brand That Opens Doors",
    description: "",
  },
  {
    time: "14:00",
    title: "The Psychology of Winning Global Opportunities",
    description: "",
  },
  {
    time: "15:00",
    title: "Mastering Scholarships and Fellowships",
    description: "",
  },
  {
    time: "16:00",
    title: "How to Think Like a Problem Solver in Africa",
    description: "",
  },
  {
    time: "17:00",
    title: "From Frustration to Global Recognition, positioning yourself for global opportuinities",
    description: "",
  },
]

const dayTwoAgenda: AgendaItem[] = [
  {
    time: "09:00",
    title: "The Power of Voice in leadership",
    description: "",
  },
  {
    time: "10:00",
    title: "Building Online Credibility That Attracts Opportunities",
    description: "",
  },
  {
    time: "11:00",
    title: "From Applicant to Asset: Building Value Before Getting employed",
    description: "",
  },
  {
    time: "14:00",
    title: "The N10,000 Job Strategy: What to Do When You're Paid Too Little to Dream Big",
    description: "",
  },
  {
    time: "15:00",
    title: "Building Legacy Beyond the Applause",
    description: "",
  },
  {
    time: "16:00",
    title: "From Top100 to Talk100: Leading the Movement Forward",
    description: "",
  },
  {
    time: "17:00",
    title: "Closing Ceremony",
    description: "",
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
    name: "Emmanuella Igboafu",
    role: "Community & Partnerships",
    imageUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Chinedu Daniel",
    role: "Operations & Experience",
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Irechukwu Goodness",
    role: "Programme Coordinator",
    imageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Kenechukwu Igboasia",
    role: "Outreach Specialist",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
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
    question: "Who can attend the Africa Future Leaders Summit 2025?",
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
  const [isKeynotesExpanded, setIsKeynotesExpanded] = useState(false);
  const [isSpeakersExpanded, setIsSpeakersExpanded] = useState(false);
  const [isTeamExpanded, setIsTeamExpanded] = useState(false);
  const [isWhyAttendExpanded, setIsWhyAttendExpanded] = useState(false);
  const [isFaqExpanded, setIsFaqExpanded] = useState(false);

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
          <span className="text-zinc-400">Africa Future Leaders Summit 2025</span>
        </div>
      </nav>

      <main className="container mx-auto space-y-10 px-4 py-8 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-white text-left">
          Africa Future Leaders Summit 2025
        </h1>
        
        <Gallery />

        <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-10 shadow-sm">
          <h2 className="text-2xl font-semibold text-white">About the Summit</h2>
          <p className="text-lg leading-relaxed text-zinc-300">
            The Africa Future Leaders Summit 2025 is Top100’s signature gathering where Africa’s brightest innovators, mission-driven
            organisations, and global allies co-create solutions. Across two energising days, the summit blends high-impact
            storytelling, collaborative labs, partner roundtables, and showcases that move bold ideas into action.
          </p>
        </section>

        <AboutSection />

        <GallerySection />





        <section className="space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/50 dark:to-slate-900/50 py-6 rounded-2xl px-4 border border-blue-100 dark:border-slate-700">
          <div className="space-y-3">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsKeynotesExpanded(!isKeynotesExpanded)}>
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mr-2">Keynotes Topic from Global Leaders</h2>
                <p className="text-slate-600 dark:text-slate-300 hidden md:block">Key themes and sessions designed for collaboration.</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsKeynotesExpanded(!isKeynotesExpanded);
                }}
                className="p-1 rounded-full bg-blue-200 dark:bg-slate-700 hover:bg-blue-300 dark:hover:bg-slate-600 transition-colors"
                aria-label={isKeynotesExpanded ? 'Collapse' : 'Expand'}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 text-blue-700 dark:text-slate-300 transition-transform ${isKeynotesExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {isKeynotesExpanded && (
            <div className="space-y-4 pt-4">
              {[
                ...dayOneAgenda.map((slot, idx) => ({ ...slot, id: `day1-${idx}`, type: 'day1' })),
                ...dayTwoAgenda.map((slot, idx) => ({ ...slot, id: `day2-${idx}`, type: 'day2' }))
              ].filter(slot => 
                slot.title !== "Who Are Africa's Future Leaders?" && 
                slot.title !== "Closing Ceremony"
              ).map((slot, index) => (
                <div 
                  key={slot.id} 
                  className={`rounded-xl border border-blue-200 dark:border-slate-600 p-4 shadow-sm transition-all duration-300 ${
                    index % 2 === 0 
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30' 
                      : 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'
                  }`}
                >
                  <p className="text-base font-medium text-slate-800 dark:text-white">{slot.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{slot.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800/50 dark:to-slate-900/50 py-6 rounded-2xl px-4 border border-emerald-100 dark:border-slate-700">
          <div className="space-y-3">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsSpeakersExpanded(!isSpeakersExpanded)}>
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mr-2">Speakers & Mentors</h2>
                <p className="text-slate-600 dark:text-slate-300 hidden md:block">Global shapers, sector leaders, and coaches committed to multiplying Top100 impact.</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSpeakersExpanded(!isSpeakersExpanded);
                }}
                className="p-1 rounded-full bg-emerald-200 dark:bg-slate-700 hover:bg-emerald-300 dark:hover:bg-slate-600 transition-colors"
                aria-label={isSpeakersExpanded ? 'Collapse' : 'Expand'}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 text-emerald-700 dark:text-slate-300 transition-transform ${isSpeakersExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {isSpeakersExpanded && (
            <div className="pt-2">
              <div className="grid gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
                {speakers.map((speaker, index) => (
                  <div
                    key={speaker.name}
                    className={`rounded-2xl border border-emerald-200 dark:border-slate-600 p-4 shadow-sm transition hover:border-emerald-400/40 ${
                      index % 2 === 0 
                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30' 
                        : 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30'
                    }`}
                  >
                    <div className="relative h-32 w-full overflow-hidden rounded-xl">
                      <Image src={speaker.imageUrl} alt={speaker.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                    </div>
                    <div className="mt-3 space-y-1">
                      <h3 className="text-base font-medium text-slate-800 dark:text-white">{speaker.name}</h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">{speaker.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800/50 dark:to-slate-900/50 py-6 rounded-2xl px-4 border border-amber-100 dark:border-slate-700">
          <div className="space-y-3">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsTeamExpanded(!isTeamExpanded)}>
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mr-2">Meet the Summit Team</h2>
                <p className="text-slate-600 dark:text-slate-300 hidden md:block">The core team crafting the experiences, partnerships, and storytelling behind the Africa Future Leaders Summit 2025.</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTeamExpanded(!isTeamExpanded);
                }}
                className="p-1 rounded-full bg-amber-200 dark:bg-slate-700 hover:bg-amber-300 dark:hover:bg-slate-600 transition-colors"
                aria-label={isTeamExpanded ? 'Collapse' : 'Expand'}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 text-amber-700 dark:text-slate-300 transition-transform ${isTeamExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {isTeamExpanded && (
            <div className="pt-2">
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                {teamMembers.map((member, index) => (
                  <div
                    key={member.name}
                    className={`group relative rounded-xl overflow-hidden border border-amber-200 dark:border-slate-600 shadow-sm transition-all duration-300 hover:shadow-md ${
                      index % 2 === 0 
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30' 
                        : 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30'
                    }`}
                  >
                    <div className="relative h-40 w-full overflow-hidden rounded-t-xl">
                      {index === 0 && (
                        <Image 
                          src="/team/emmanuella igboafu.jpg" 
                          alt={member.name} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-105" 
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                        />
                      )}
                      {index === 1 && (
                        <Image 
                          src="/team/chinedu daniel.jpg.png" 
                          alt={member.name} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-105" 
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                        />
                      )}
                      {index === 2 && (
                        <Image 
                          src="/team/irechukwu Goodness.jpeg" 
                          alt={member.name} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-105" 
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                        />
                      )}
                      {index === 3 && (
                        <Image 
                          src="/team/stephen igboasia.jpeg" 
                          alt={member.name} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-105" 
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-slate-800 dark:text-white truncate">{member.name}</h3>
                      <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>









        <section className="space-y-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800/50 dark:to-slate-900/50 py-6 rounded-2xl px-4 border border-purple-100 dark:border-slate-700">
          <div className="space-y-3">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsFaqExpanded(!isFaqExpanded)}>
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mr-2">Frequently Asked Questions</h2>
                <p className="text-slate-600 dark:text-slate-300 hidden md:block">Everything you need to know about participating, partnering, or showcasing at the summit.</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFaqExpanded(!isFaqExpanded);
                }}
                className="p-1 rounded-full bg-purple-200 dark:bg-slate-700 hover:bg-purple-300 dark:hover:bg-slate-600 transition-colors"
                aria-label={isFaqExpanded ? 'Collapse' : 'Expand'}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 text-purple-700 dark:text-slate-300 transition-transform ${isFaqExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {isFaqExpanded && (
            <Accordion type="single" collapsible className="space-y-4 pt-4">
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
          )}
        </section>

        <section className="rounded-3xl border border-orange-400/20 bg-gradient-to-r from-orange-500/30 via-orange-500/10 to-transparent p-10 text-center shadow-lg">
          <h2 className="text-3xl font-semibold text-white">Be Part of the Africa Future Leaders Summit 2026 Experience</h2>
          <p className="mt-4 text-lg text-zinc-300 dark:text-orange-100">
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


      </main>
    </div>
  )
}
