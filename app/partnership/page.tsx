import Image from "next/image"
import type { Metadata } from "next"
import { ArrowRight, Globe2, Quote } from "lucide-react"

import { Button } from "@/components/ui/button"
import LogoMarquee from "./LogoMarquee"

export const metadata: Metadata = {
  title: "Partner with Top100 Africa Future Leaders",
  description:
    "Partner with Top100 on a shared mission to identify, empower, and celebrate Africa's youth leaders. Join the organizations, institutions, and speakers powering the movement.",
  openGraph: {
    title: "Partner with Top100 Africa Future Leaders",
    description:
      "Partner with Top100 on a shared mission to identify, empower, and celebrate Africa's youth leaders.",
    images: ["/african-students-celebrating-achievement-at-gradua.jpg"],
  },
}

// Partner enquiries route to the partnerships inbox.
const PARTNERSHIP_CONTACT_URL =
  "mailto:partnership@top100afl.com?subject=Partnership%20enquiry%20—%20Top100%20Africa%20Future%20Leaders"

// Organizations we've worked with directly.
const corePartners = [
  {
    name: "One Young World West & Central Africa",
    logo: "/3.png",
    alt: "One Young World West and Central Africa logo",
    description:
      "Partnering on youth-led initiatives that accelerate leadership, innovation, and social impact across the continent.",
  },
  {
    name: "ALX Nigeria",
    logo: "/7.png",
    alt: "ALX Nigeria logo",
    description:
      "Driving Africa's digital transformation by developing tech talent and empowering the next generation of builders.",
  },
  {
    name: "Learning Planet Institute",
    logo: "/6.png",
    alt: "Learning Planet Institute logo",
    description:
      "Co-creating learning ecosystems with UNESCO to nurture problem-solvers tackling humanity's biggest challenges.",
  },
]

// Institutions our speakers, mentors, and awardees are affiliated with — directly or
// indirectly. `logo` points to a brand mark in /public/logos; null falls back to an icon.
const affiliatedInstitutions = [
  { name: "World Bank", logo: "/logos/world-bank.png" },
  { name: "Mastercard", logo: "/logos/mastercard.png" },
  { name: "Nigeria LNG", logo: "/logos/nigeria-lng.jpg" },
  { name: "TotalEnergies", logo: "/logos/totalenergies.png" },
  { name: "UNESCO", logo: null },
  { name: "African Development Bank", logo: "/logos/african-development-bank.png" },
  { name: "African Union", logo: "/logos/african-union.png" },
  { name: "United Nations", logo: "/logos/united-nations.png" },
  { name: "Google", logo: "/logos/google.png" },
  { name: "Microsoft", logo: "/logos/microsoft.png" },
  { name: "Mastercard Foundation", logo: "/logos/mastercard-foundation.png" },
  { name: "Bill & Melinda Gates Foundation", logo: "/logos/gates-foundation.png" },
  { name: "UNICEF", logo: "/logos/unicef.png" },
  { name: "World Health Organization", logo: "/logos/who.png" },
  { name: "Andela", logo: "/logos/andela.png" },
  { name: "Flutterwave", logo: "/logos/flutterwave.png" },
  { name: "Paystack", logo: "/logos/paystack.png" },
  { name: "MTN", logo: "/logos/mtn.png" },
  { name: "Dangote Group", logo: "/logos/dangote.png" },
  { name: "Access Bank", logo: "/logos/access-bank.png" },
  { name: "GTBank", logo: "/logos/gtbank.png" },
  { name: "KPMG", logo: "/logos/kpmg.png" },
  { name: "Deloitte", logo: "/logos/deloitte.png" },
  { name: "Shell", logo: "/logos/shell.png" },
  { name: "Interswitch", logo: "/logos/interswitch.png" },
  { name: "Jumia", logo: "/logos/jumia.png" },
]

// Quotes gathered from partners at previous events.
const partnerQuotes = [
  {
    quote:
      "Top100 is building the kind of youth leadership pipeline the continent needs — intentional, credible, and rooted in real communities. It's a partnership we're proud of.",
    name: "One Young World",
    role: "West & Central Africa",
    logo: "/3.png",
    alt: "One Young World logo",
  },
  {
    quote:
      "The energy and ambition of the Top100 network mirrors everything we stand for at ALX. Together we're turning African talent into Africa's builders.",
    name: "ALX Nigeria",
    role: "Programme Partner",
    logo: "/7.png",
    alt: "ALX Nigeria logo",
  },
  {
    quote:
      "Working with Top100 connected our learning ecosystem to a generation of problem-solvers. Their awardees are exactly the changemakers the world is looking for.",
    name: "IPF Paris",
    role: "Learning Planet Institute, Paris",
    logo: "/6.png",
    alt: "IPF Paris logo",
  },
]

// Moments from our recent gatherings — kept to a balanced, uniform grid.
const eventGallery = [
  "/IMG_0673.jpg",
  "/IMG_0676.jpg",
  "/IMG_0679.jpg",
  "/IMG_0681.jpg",
  "/IMG_0683.jpg",
  "/IMG_0685.jpg",
]

export default function PartnershipPage() {
  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf4_46%,#f7f3ec_100%)]">
      {/* ============================ HERO ============================ */}
      <section className="px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <div className="container">
          <div className="relative mx-auto overflow-hidden rounded-[32px] bg-[#05060f]">
            {/* Layered light-fan backdrop */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "conic-gradient(from 200deg at 50% 118%, transparent 0deg, rgba(99,102,241,0.28) 20deg, transparent 32deg, rgba(168,85,247,0.3) 46deg, transparent 60deg, rgba(249,115,22,0.28) 74deg, transparent 88deg, rgba(168,85,247,0.24) 104deg, transparent 120deg, rgba(99,102,241,0.26) 138deg, transparent 160deg)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 120%, rgba(147,51,234,0.35) 0%, rgba(5,6,15,0) 55%), radial-gradient(90% 70% at 50% -10%, rgba(15,23,42,0.6) 0%, rgba(5,6,15,0) 60%)",
              }}
            />

            <div className="relative z-10 flex min-h-[440px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[500px] sm:px-8 lg:min-h-[560px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-[rgba(255,255,255,0.6)]">
                Partnerships
              </p>
              <h1 className="mt-6 max-w-4xl text-balance text-[2.6rem] font-semibold leading-[1.02] tracking-tight text-[#fff] drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)] sm:text-6xl lg:text-7xl">
                Partner with Top100 on a shared mission.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[rgba(255,255,255,0.72)] sm:text-lg">
                We identify, empower, and celebrate Africa&apos;s youth leaders. Bring your
                brand, resources, or platform alongside a network that already spans 31 countries.
              </p>
              <div className="mt-9">
                <Button
                  asChild
                  className="h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-base text-[#fff] shadow-none hover:opacity-95"
                >
                  <a href={PARTNERSHIP_CONTACT_URL}>
                    Contact us
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CORE PARTNERS (the 3) ==================== */}
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container space-y-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-orange-700">
              Trusted collaborators
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Organizations we&apos;ve worked with — directly and indirectly.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              From programme delivery to global platforms, these partners help us reach and
              elevate Africa&apos;s boldest young leaders.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {corePartners.map((partner) => (
              <div
                key={partner.name}
                className="flex flex-col items-center rounded-[28px] border border-orange-100 bg-white p-7 text-center transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex h-24 w-full items-center justify-center">
                  <Image
                    src={partner.logo}
                    alt={partner.alt}
                    width={200}
                    height={88}
                    className="h-20 w-auto object-contain"
                  />
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
                  {partner.name}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{partner.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= AFFILIATED INSTITUTIONS (full-bleed logo wall) ======= */}
      <section className="border-y border-orange-100 bg-[#faf6ef] py-12 sm:py-16">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-orange-700">
              Global reach
            </p>
            <h2 className="mt-3 flex items-center justify-center gap-2.5 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              <Globe2 className="h-7 w-7 shrink-0 text-orange-500 sm:h-8 sm:w-8" aria-hidden />
              Our speakers are affiliated worldwide.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              The voices on our stages come from more than 25 organizations shaping business,
              policy, and innovation across the globe.
            </p>
          </div>
        </div>

        {/* Full-width marquee — intentionally outside the container */}
        <div className="mt-9 space-y-3">
          <LogoMarquee items={affiliatedInstitutions.slice(0, 13)} offset={0} />
          <LogoMarquee items={affiliatedInstitutions.slice(13)} offset={2} />
        </div>
      </section>

      {/* ==================== PARTNER QUOTES ==================== */}
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container space-y-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-orange-700">
              In their words
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              What our partners say after working with us.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {partnerQuotes.map((item) => (
              <figure
                key={item.name}
                className="flex flex-col rounded-[28px] border border-orange-100 bg-white p-7"
              >
                <Quote className="h-8 w-8 text-orange-400" aria-hidden />
                <blockquote className="mt-4 flex-1 text-[0.98rem] leading-8 text-slate-700">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-4 border-t border-orange-100 pt-5">
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center">
                    <Image
                      src={item.logo}
                      alt={item.alt}
                      width={72}
                      height={48}
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-slate-950">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">{item.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== EVENT GALLERY ==================== */}
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container space-y-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-orange-700">
              On the ground
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Moments from our recent gatherings.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              A look at the awardees, partners, and speakers who show up when the Top100
              community comes together.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {eventGallery.map((src) => (
              <div
                key={src}
                className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-orange-100 bg-slate-100"
              >
                <Image
                  src={src}
                  alt="Top100 Africa Future Leaders event"
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover transition duration-700 hover:scale-[1.05]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== BOTTOM CTA ==================== */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="container">
          <div className="relative overflow-hidden rounded-[32px] bg-[#05060f] px-6 py-14 text-center sm:px-10 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(90% 120% at 50% -10%, rgba(249,115,22,0.28) 0%, rgba(5,6,15,0) 55%), radial-gradient(80% 120% at 50% 120%, rgba(147,51,234,0.28) 0%, rgba(5,6,15,0) 55%)",
              }}
            />
            <div className="relative z-10 mx-auto max-w-2xl">
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-[#fff] sm:text-4xl lg:text-5xl">
                Ready to build something lasting with us?
              </h2>
              <p className="mt-4 text-base leading-8 text-[rgba(255,255,255,0.72)] sm:text-lg">
                Tell us how you&apos;d like to partner — sponsorship, mentorship, opportunities,
                or platform. We&apos;ll take it from there.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  className="h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-base text-[#fff] shadow-none hover:opacity-95"
                >
                  <a href={PARTNERSHIP_CONTACT_URL}>
                    Contact us
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-14 rounded-full border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.05)] px-8 text-base text-[#fff] hover:bg-[rgba(255,255,255,0.1)] hover:text-[#fff]"
                >
                  <a href={PARTNERSHIP_CONTACT_URL}>Email the team</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
