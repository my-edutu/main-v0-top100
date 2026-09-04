# Impact Beyond Recognition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the closed-application homepage campaign with “Celebrating Impact Beyond Recognition,” add stable documentary-led homepage sections, and launch the `/impacts` and `/hall-of-fame` experiences.

**Architecture:** Put verified editorial facts in pure typed modules, then compose server-rendered Next.js pages from small presentational components. Keep client state isolated to the rotating event-image feature, use native scrolling for galleries, and reuse the existing awardee/post loaders instead of adding a new backend.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS, `next/image`, Framer Motion, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-09-04-impact-beyond-recognition-design.md`

## Global Constraints

- Homepage eyebrow: **Our 2026 Focus**.
- Homepage headline: **Celebrating Impact Beyond Recognition**.
- Homepage supporting copy: **Recognition is only the beginning. Discover the leaders turning achievement into lasting change across Africa.**
- Primary hero CTA: **Explore the impact** → `/impacts`.
- Secondary hero CTA: **Meet the leaders** → `/hall-of-fame`.
- Use the route spelling `/hall-of-fame` everywhere.
- Display **2,000+ Awardees**, **31+ Countries**, and **97,000 Lives impacted**.
- Do not invent speaker biographies, occupations, achievements, quotations, external links, or team photographs.
- New team members without supplied photographs use initial portraits.
- Do not add a speaker CMS, database tables, hosted video, or changes to application, authentication, dashboard, or award-processing behavior.
- Respect `prefers-reduced-motion`, WCAG AA contrast, keyboard access, and a 320px minimum viewport.
- Preserve all unrelated existing worktree changes.

## File Structure

### Create

- `lib/impact-content.ts` — typed hero copy, metrics, team, event-image paths, and pure lookup helpers.
- `lib/speakers.ts` — typed verified Hall of Fame registry and speaker lookup.
- `lib/story-covers.ts` — deterministic cover-image resolution for homepage posts.
- `app/components/InitialPortrait.tsx` — shared accessible initials fallback.
- `app/components/PortraitImage.tsx` — image/error wrapper that swaps to initials.
- `app/components/SpeakerCard.tsx` — reusable speaker portrait link.
- `app/components/HallOfFamePreview.tsx` — bounded homepage/impact-hub speaker preview.
- `app/components/RotatingVisionSection.tsx` — isolated crossfade client component.
- `app/impacts/page.tsx` — impact hub server page.
- `app/hall-of-fame/page.tsx` — speaker gallery server page.
- `app/hall-of-fame/[slug]/page.tsx` — static speaker profile page.
- `tests/site/impact-content.test.ts` — content and route invariants.
- `tests/site/speakers.test.ts` — registry, asset, and lookup invariants.
- `tests/site/story-covers.test.ts` — exact cover fallback policy.

### Modify

- `app/components/Header.tsx` — remove persistent Get Started CTA; add Impact and Hall of Fame links.
- `app/components/HomePageHeroSection.tsx` — approved message, destinations, stable one-shot motion.
- `app/page.tsx` — new section order, rotating vision component, partner CTA, and five-person team data.
- `app/components/ImpactSection.tsx` — consume shared metrics and render 2,000+.
- `app/components/BlogSection.tsx` — pass resolved per-story cover and alt text.
- `app/components/HomeFeaturedAwardees.tsx` — native scroll-snap gallery without timer state.
- `components/BlogCover.tsx` — accept distinct alt text and suppress broken-image fallback recursion.
- `lib/og-pages.ts` — register new static route share cards and update awardee count.
- `app/layout.tsx` — remove closed-application wording from global metadata and OG alt text.

---

### Task 1: Establish Verified Impact and Speaker Data

**Files:**
- Create: `lib/impact-content.ts`
- Create: `lib/speakers.ts`
- Create: `tests/site/impact-content.test.ts`
- Create: `tests/site/speakers.test.ts`

**Interfaces:**
- Produces: `IMPACT_HERO`, `IMPACT_STATS`, `TEAM_MEMBERS`, `VISION_IMAGES`, and their exported types.
- Produces: `SPEAKERS: readonly Speaker[]`, `FEATURED_SPEAKER_SLUGS`, `getSpeaker(slug: string): Speaker | undefined`, and `getFeaturedSpeakers(): Speaker[]`.
- Consumes: local assets under `public/` only.

- [ ] **Step 1: Write failing content tests**

```ts
// tests/site/impact-content.test.ts
import { describe, expect, it } from "vitest"
import { IMPACT_HERO, IMPACT_STATS, TEAM_MEMBERS, VISION_IMAGES } from "@/lib/impact-content"

describe("impact content", () => {
  it("uses the approved closed-application replacement", () => {
    expect(IMPACT_HERO).toEqual({
      eyebrow: "Our 2026 Focus",
      title: "Celebrating Impact Beyond Recognition",
      description:
        "Recognition is only the beginning. Discover the leaders turning achievement into lasting change across Africa.",
      primaryCta: { label: "Explore the impact", href: "/impacts" },
      secondaryCta: { label: "Meet the leaders", href: "/hall-of-fame" },
    })
  })

  it("publishes the approved movement metrics", () => {
    expect(IMPACT_STATS.map(({ value, suffix }) => `${value.toLocaleString()}${suffix}`)).toEqual([
      "31+",
      "97,000",
      "2,000+",
    ])
  })

  it("contains the approved team and no Chinedu entry", () => {
    expect(TEAM_MEMBERS.map((member) => [member.name, member.role])).toEqual([
      ["Nwosu Paul Light", "Founder"],
      ["Emmanuella Igboafu", "Team Lead"],
      ["Gabriel Ajewole", "Project Manager"],
      ["Favour Okolie", "Partnership Team"],
      ["Kenechukwu Igboasia", "Talent Management"],
    ])
    expect(TEAM_MEMBERS.some(({ name }) => name.includes("Chinedu"))).toBe(false)
  })

  it("rotates only known Top100 event photographs", () => {
    expect(VISION_IMAGES.length).toBeGreaterThanOrEqual(4)
    expect(VISION_IMAGES.every((src) => /^\/IMG_06(?:7|8)\d\.jpg$/.test(src))).toBe(true)
  })
})
```

```ts
// tests/site/speakers.test.ts
import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { FEATURED_SPEAKER_SLUGS, SPEAKERS, getFeaturedSpeakers, getSpeaker } from "@/lib/speakers"

describe("Hall of Fame registry", () => {
  it("contains ten uniquely addressable 2025 speakers", () => {
    expect(SPEAKERS).toHaveLength(10)
    expect(new Set(SPEAKERS.map(({ slug }) => slug)).size).toBe(SPEAKERS.length)
    expect(SPEAKERS.every(({ eventYears }) => eventYears.includes(2025))).toBe(true)
  })

  it("references assets that exist under public", () => {
    for (const speaker of SPEAKERS) {
      for (const asset of [speaker.portrait, speaker.bioArtwork, speaker.announcementArtwork].filter(Boolean)) {
        expect(existsSync(path.join(process.cwd(), "public", asset!.slice(1))), asset).toBe(true)
      }
    }
  })

  it("looks up known speakers and rejects unknown slugs", () => {
    expect(getSpeaker("ruby-igwe")?.name).toBe("Ruby Igwe")
    expect(getSpeaker("not-a-speaker")).toBeUndefined()
  })

  it("returns featured speakers in configured order", () => {
    expect(getFeaturedSpeakers().map(({ slug }) => slug)).toEqual(FEATURED_SPEAKER_SLUGS)
  })
})
```

- [ ] **Step 2: Run the tests and verify missing-module failures**

Run: `npx vitest run tests/site/impact-content.test.ts tests/site/speakers.test.ts`

Expected: FAIL because `lib/impact-content.ts` and `lib/speakers.ts` do not exist.

- [ ] **Step 3: Implement the typed impact constants**

```ts
// lib/impact-content.ts
export const IMPACT_HERO = {
  eyebrow: "Our 2026 Focus",
  title: "Celebrating Impact Beyond Recognition",
  description:
    "Recognition is only the beginning. Discover the leaders turning achievement into lasting change across Africa.",
  primaryCta: { label: "Explore the impact", href: "/impacts" },
  secondaryCta: { label: "Meet the leaders", href: "/hall-of-fame" },
} as const

export const IMPACT_STATS = [
  { key: "countries", label: "Countries", description: "Across Africa", value: 31, suffix: "+" },
  { key: "lives", label: "Lives impacted", description: "Across Africa", value: 97000, suffix: "" },
  { key: "awardees", label: "Awardees", description: "Across Africa", value: 2000, suffix: "+" },
] as const

export type TeamMember = { name: string; role: string; image?: string; linkedIn?: string }

export const TEAM_MEMBERS: readonly TeamMember[] = [
  { name: "Nwosu Paul Light", role: "Founder", image: "/team/Paul light.jpg.png", linkedIn: "https://www.linkedin.com/in/paul-light-/" },
  { name: "Emmanuella Igboafu", role: "Team Lead", image: "/team/emmanuella igboafu.jpg", linkedIn: "https://www.linkedin.com/in/emmanuellaigboafu/" },
  { name: "Gabriel Ajewole", role: "Project Manager" },
  { name: "Favour Okolie", role: "Partnership Team" },
  { name: "Kenechukwu Igboasia", role: "Talent Management" },
]

export const VISION_IMAGES = [
  "/IMG_0672.jpg",
  "/IMG_0675.jpg",
  "/IMG_0679.jpg",
  "/IMG_0681.jpg",
  "/IMG_0683.jpg",
] as const
```

- [ ] **Step 4: Implement the verified speaker registry**

Create `lib/speakers.ts` with this type and exact ten records. Use the printed 2025 artwork as evidence for names, talk topics, roles, and artwork associations; do not extrapolate beyond the strings below.

```ts
export type Speaker = {
  slug: string
  name: string
  portrait: string
  label: string
  topic?: string
  announcementArtwork?: string
  bioArtwork?: string
  eventYears: readonly number[]
}

export const SPEAKERS: readonly Speaker[] = [
  { slug: "ruby-igwe", name: "Ruby Igwe", portrait: "/speakers/Ruby Igwe.jpeg", label: "Country Director, ALX Africa (Nigeria) · Co-Founder, Arinxi.ng", topic: "The 3 I’s of Leadership — Impact, Influence and Intellectualism", announcementArtwork: "/speakers announcement/9.png", bioArtwork: "/speakers bio/2.png", eventYears: [2025] },
  { slug: "odinakachi-umunna", name: "Odinakachi Umunna", portrait: "/speakers/odinakachi umunna.jpeg", label: "Energy Leader · One Young World Ambassador", announcementArtwork: "/speakers announcement/10.png", eventYears: [2025] },
  { slug: "lungile-tlomatsana", name: "Lungile Tlomatsana", portrait: "/speakers/lungile.jpeg", label: "Coordinating Ambassador, One Young World South Africa · Research Specialist", topic: "Crafting a Personal Brand That Opens Doors", announcementArtwork: "/speakers announcement/10.png", bioArtwork: "/speakers bio/21.png", eventYears: [2025] },
  { slug: "kaitochukwu-chukwudi", name: "Kaitochukwu Chukwudi", portrait: "/speakers/kaitochukwu chukwudi.jpeg", label: "Energy · Engineering · Sustainability", topic: "The Psychology of Winning Global Opportunities", announcementArtwork: "/speakers announcement/11.png", bioArtwork: "/speakers bio/25.png", eventYears: [2025] },
  { slug: "samuel-olarewaju", name: "Samuel Olarewaju", portrait: "/speakers/samuel olanrewaju.jpeg", label: "Research-driven problem solver · Strategy, Innovation and STEM Leadership", topic: "Mastering Scholarships and Fellowships", announcementArtwork: "/speakers announcement/11.png", bioArtwork: "/speakers bio/23.png", eventYears: [2025] },
  { slug: "damilola-babatunde", name: "Damilola Babatunde", portrait: "/speakers/damilola babatunde.jpeg", label: "Global Policy Advisor · Peace and Development Advocate", topic: "From Frustration to Global Recognition", announcementArtwork: "/speakers announcement/12.png", bioArtwork: "/speakers bio/19.png", eventYears: [2025] },
  { slug: "tochukwu-idinmachi", name: "Tochukwu Idinmachi", portrait: "/speakers/tochukwu idinmachi.jpeg", label: "Top100 speaker", topic: "The Power of Voice in Leadership", announcementArtwork: "/speakers announcement/13.png", bioArtwork: "/speakers bio/15.png", eventYears: [2025] },
  { slug: "belinda-nkechi-idinmachi", name: "Belinda Nkechi Idinmachi", portrait: "/speakers/belinda nkechi.jpeg", label: "Coordinating Ambassador, One Young World West & Central Africa", topic: "Building Online Credibility That Attracts Opportunities", announcementArtwork: "/speakers announcement/13.png", bioArtwork: "/speakers bio/31.png", eventYears: [2025] },
  { slug: "leye-falade", name: "Leye Falade", portrait: "/speakers/Leye Falade.jpeg", label: "Global Energy Executive · Managing Director, Brunei LNG", topic: "How to Think Like a Problem Solver in Africa", announcementArtwork: "/speakers announcement/14.png", bioArtwork: "/speakers bio/17.png", eventYears: [2025] },
  { slug: "yetunde-shado-asekun", name: "Yetunde Shado-Asekun", portrait: "/speakers/yetunde asekun.jpeg", label: "Top100 speaker", topic: "From Applicant to Asset: Building Value Before Getting Employed", announcementArtwork: "/speakers announcement/14.png", bioArtwork: "/speakers bio/35.png", eventYears: [2025] },
] as const

export const FEATURED_SPEAKER_SLUGS = [
  "ruby-igwe",
  "odinakachi-umunna",
  "lungile-tlomatsana",
  "leye-falade",
] as const

export function getSpeaker(slug: string): Speaker | undefined {
  return SPEAKERS.find((speaker) => speaker.slug === slug)
}

export function getFeaturedSpeakers(): Speaker[] {
  return FEATURED_SPEAKER_SLUGS.map((slug) => getSpeaker(slug)).filter(
    (speaker): speaker is Speaker => Boolean(speaker),
  )
}
```

- [ ] **Step 5: Run tests and type checking**

Run: `npx vitest run tests/site/impact-content.test.ts tests/site/speakers.test.ts && npm run typecheck`

Expected: both test files PASS and TypeScript reports no errors introduced by these modules.

- [ ] **Step 6: Commit the content foundation**

```bash
git add lib/impact-content.ts lib/speakers.ts tests/site/impact-content.test.ts tests/site/speakers.test.ts
git commit -m "feat: add verified impact and speaker content"
```

---

### Task 2: Replace Closed-Application Header and Hero Messaging

**Files:**
- Create: `lib/site-navigation.ts`
- Create: `tests/site/navigation-content.test.ts`
- Modify: `app/components/Header.tsx`
- Modify: `app/components/HomePageHeroSection.tsx`

**Interfaces:**
- Consumes: `IMPACT_HERO` from `lib/impact-content.ts`.
- Produces: `PRIMARY_NAV_ITEMS` and the visible mobile/desktop Impact and Hall of Fame navigation.

- [ ] **Step 1: Write the failing navigation content test**

```ts
// tests/site/navigation-content.test.ts
import { describe, expect, it } from "vitest"
import { PRIMARY_NAV_ITEMS } from "@/lib/site-navigation"

describe("public navigation", () => {
  it("promotes impact and Hall of Fame without Get Started", () => {
    expect(PRIMARY_NAV_ITEMS).toEqual([
      { label: "Home", href: "/" },
      { label: "Impact", href: "/impacts" },
      { label: "Hall of Fame", href: "/hall-of-fame" },
      { label: "Awardees", href: "/awardees" },
    ])
    expect(PRIMARY_NAV_ITEMS.some(({ label }) => label === "Get Started")).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/site/navigation-content.test.ts`

Expected: FAIL because `lib/site-navigation.ts` does not exist.

- [ ] **Step 3: Add navigation data and wire it into the header**

```ts
// lib/site-navigation.ts
export const PRIMARY_NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Impact", href: "/impacts" },
  { label: "Hall of Fame", href: "/hall-of-fame" },
  { label: "Awardees", href: "/awardees" },
] as const
```

In `Header.tsx`, map `PRIMARY_NAV_ITEMS` for desktop and mobile. Delete both `/get-started` button blocks. Keep the current Summit, Events, Magazine, and Partner groups. The compact header grid becomes `grid-cols-[minmax(0,1fr)_auto]`; the logo remains left-aligned and the menu trigger right-aligned.

- [ ] **Step 4: Replace the hero copy and controls**

In `HomePageHeroSection.tsx`:

```tsx
import { ArrowRight, UsersRound } from "lucide-react"
import { IMPACT_HERO } from "@/lib/impact-content"

<p className="mx-auto w-fit rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-700">
  {IMPACT_HERO.eyebrow}
</p>
<h1 className="text-balance text-4xl font-semibold leading-[0.98] text-slate-950 sm:text-5xl md:text-6xl lg:text-7xl">
  {IMPACT_HERO.title}
</h1>
<p className="mx-auto max-w-3xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8 md:text-xl">
  {IMPACT_HERO.description}
</p>
<Link href={IMPACT_HERO.primaryCta.href} className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 font-semibold text-white hover:bg-orange-600">
  {IMPACT_HERO.primaryCta.label}<ArrowRight className="h-4 w-4" />
</Link>
<Link href={IMPACT_HERO.secondaryCta.href} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 font-semibold text-slate-950 hover:border-orange-500 hover:text-orange-700">
  <UsersRound className="h-4 w-4" />{IMPACT_HERO.secondaryCta.label}
</Link>
```

Delete `FloatingParticle`, `isMounted`, random positioning, hover overlay state, Intersection Observer restart logic, the `/apply` CTA, and the `/partnership` CTA. Use a one-shot CSS or Framer entrance with `initial={false}` under reduced motion. Keep the country ticker but reduce hero bottom padding so the approved copy remains visible at 398×814.

- [ ] **Step 5: Run tests and type checking**

Run: `npx vitest run tests/site/navigation-content.test.ts tests/site/impact-content.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the header and hero**

```bash
git add lib/site-navigation.ts tests/site/navigation-content.test.ts app/components/Header.tsx app/components/HomePageHeroSection.tsx
git commit -m "feat: lead the site with impact beyond recognition"
```

---

### Task 3: Build Shared Portrait Components and the Hall of Fame Routes

**Files:**
- Create: `app/components/InitialPortrait.tsx`
- Create: `app/components/PortraitImage.tsx`
- Create: `app/components/SpeakerCard.tsx`
- Create: `app/components/HallOfFamePreview.tsx`
- Create: `app/hall-of-fame/page.tsx`
- Create: `app/hall-of-fame/[slug]/page.tsx`
- Modify: `app/page.tsx`
- Modify: `lib/og-pages.ts`

**Interfaces:**
- Consumes: `Speaker`, `SPEAKERS`, `getSpeaker`, and `getFeaturedSpeakers` from `lib/speakers.ts`.
- Produces: `<SpeakerCard speaker priority? />`, `<HallOfFamePreview speakers />`, static speaker paths, and speaker metadata.

- [ ] **Step 1: Add the initials and speaker card components**

Implement initials without treating the letters as image alt text:

```tsx
// app/components/InitialPortrait.tsx
export default function InitialPortrait({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("")
  return (
    <div aria-hidden="true" className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#111827,#431407)] text-3xl font-semibold tracking-[0.18em] text-orange-100">
      {initials}
    </div>
  )
}
```

Wrap local portraits so broken or missing files use the same fallback:

```tsx
// app/components/PortraitImage.tsx
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import InitialPortrait from "./InitialPortrait"

type PortraitImageProps = {
  src?: string
  name: string
  priority?: boolean
  sizes: string
  className?: string
}

export default function PortraitImage({ src, name, priority = false, sizes, className }: PortraitImageProps) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (!src || failed) return <InitialPortrait name={name} />
  return <Image src={src} alt={`Portrait of ${name}`} fill priority={priority} sizes={sizes} className={className} onError={() => setFailed(true)} />
}
```

```tsx
// app/components/SpeakerCard.tsx
export default function SpeakerCard({ speaker, priority = false }: { speaker: Speaker; priority?: boolean }) {
  return (
    <Link href={`/hall-of-fame/${speaker.slug}`} className="group block snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
      <article>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-slate-200">
          <PortraitImage src={speaker.portrait} name={speaker.name} priority={priority} sizes="(max-width: 640px) 72vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-4 left-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">Speaker · 2025</span>
        </div>
        <h3 className="mt-4 text-xl font-semibold text-slate-950">{speaker.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{speaker.label}</p>
      </article>
    </Link>
  )
}
```

- [ ] **Step 2: Add the reusable Hall of Fame preview**

`HallOfFamePreview` accepts `readonly Speaker[]`, renders a dark editorial wrapper, native `overflow-x-auto snap-x snap-mandatory` cards at mobile widths, a four-column grid at large widths, and the CTA below.

```tsx
<Link href="/hall-of-fame" className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600">
  View the Hall of Fame <ArrowRight className="h-4 w-4" />
</Link>
```

- [ ] **Step 3: Insert the preview before About the movement**

In `app/page.tsx`, call `getFeaturedSpeakers()` at module/render scope and place:

```tsx
<HallOfFamePreview speakers={getFeaturedSpeakers()} />
```

immediately after `<HomePageHeroSection />` and before the current About section.

- [ ] **Step 4: Implement `/hall-of-fame`**

Add the Hall of Fame card to `PAGE_OG` before creating the route:

```ts
"/hall-of-fame": {
  eyebrow: "Hall of Fame",
  title: "Leaders Who Chose Impact",
  subtitle: "The speakers who have inspired and supported the Top100 community.",
  hero: "/speakers/Ruby Igwe.jpeg",
},
```

Export static metadata using `ogMetadata(pageOg("/hall-of-fame"), { url: "/hall-of-fame" })` and canonical `${SITE_URL}/hall-of-fame`, then render all `SPEAKERS` in a responsive two-, three-, and four-column gallery. The introduction copy is:

```tsx
<p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">Our Hall of Fame</p>
<h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
  Leaders who chose impact
</h1>
<p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
  Meet the speakers who have shared their experience, challenged our community, and helped Africa’s future leaders see what is possible.
</p>
```

- [ ] **Step 5: Implement static speaker profiles**

```tsx
// app/hall-of-fame/[slug]/page.tsx
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import PortraitImage from "@/app/components/PortraitImage"
import { ogMetadata } from "@/lib/og"
import { SITE_URL } from "@/lib/site"
import { SPEAKERS, getSpeaker } from "@/lib/speakers"

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return SPEAKERS.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const speaker = getSpeaker(slug)
  if (!speaker) return {}
  return {
    title: `${speaker.name} | Hall of Fame`,
    description: `${speaker.name}, a ${speaker.label}, in the Top100 Africa Future Leaders Hall of Fame.`,
    alternates: { canonical: `${SITE_URL}/hall-of-fame/${speaker.slug}` },
    ...ogMetadata(
      { eyebrow: "Hall of Fame", title: speaker.name, subtitle: speaker.label, hero: speaker.portrait },
      { url: `/hall-of-fame/${speaker.slug}` },
    ),
  }
}

export default async function SpeakerPage({ params }: PageProps) {
  const { slug } = await params
  const speaker = getSpeaker(slug)
  if (!speaker) notFound()

  return (
    <main className="bg-[#fffaf2] text-slate-950">
      <section className="container grid gap-10 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-slate-200">
          <PortraitImage src={speaker.portrait} name={speaker.name} priority sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" />
        </div>
        <div className="self-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">Hall of Fame · {speaker.eventYears.join(", ")}</p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">{speaker.name}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{speaker.label}</p>
          {speaker.topic ? <h2 className="mt-10 text-2xl font-semibold">“{speaker.topic}”</h2> : null}
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">Part of the Top100 speaker community, sharing experience and perspective with Africa’s next generation of leaders.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/hall-of-fame" className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-white">Back to Hall of Fame</Link>
            <Link href="/impacts" className="rounded-full border border-slate-300 px-5 py-3 font-semibold">Explore the impact</Link>
          </div>
        </div>
      </section>
      {speaker.bioArtwork ? (
        <section className="container pb-16">
          <Image src={speaker.bioArtwork} alt={`${speaker.name} 2025 speaker session artwork`} width={540} height={675} className="mx-auto h-auto w-full max-w-xl rounded-[2rem]" />
        </section>
      ) : speaker.announcementArtwork ? (
        <section className="container pb-16">
          <Image src={speaker.announcementArtwork} alt={`${speaker.name} 2025 speaker announcement`} width={540} height={675} className="mx-auto h-auto w-full max-w-xl rounded-[2rem]" />
        </section>
      ) : null}
    </main>
  )
}
```

Use this exact neutral paragraph where no biography exists: “Part of the Top100 speaker community, sharing experience and perspective with Africa’s next generation of leaders.” Do not turn the talk topic or job-label fragments into a prose biography.

- [ ] **Step 6: Verify the routes**

Run: `npx vitest run tests/site/speakers.test.ts && npm run typecheck && npm run build`

Expected: PASS; build output includes `/hall-of-fame` and ten generated `/hall-of-fame/[slug]` pages.

- [ ] **Step 7: Commit the Hall of Fame**

```bash
git add app/components/InitialPortrait.tsx app/components/PortraitImage.tsx app/components/SpeakerCard.tsx app/components/HallOfFamePreview.tsx app/hall-of-fame app/page.tsx lib/og-pages.ts
git commit -m "feat: add the Top100 Hall of Fame"
```

---

### Task 4: Upgrade Vision, Metrics, Partners, and Team Sections

**Files:**
- Create: `app/components/RotatingVisionSection.tsx`
- Modify: `app/components/ImpactSection.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `VISION_IMAGES`, `IMPACT_STATS`, and `TEAM_MEMBERS` from `lib/impact-content.ts`.
- Consumes: `InitialPortrait` from Task 3.
- Produces: `<RotatingVisionSection images />`.

- [ ] **Step 1: Implement visibility- and motion-aware image rotation**

```tsx
// app/components/RotatingVisionSection.tsx
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useReducedMotion } from "framer-motion"

export default function RotatingVisionSection({ images }: { images: readonly string[] }) {
  const [active, setActive] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion || images.length < 2) return
    let timer: ReturnType<typeof setInterval> | undefined
    const sync = () => {
      if (document.hidden) {
        if (timer) clearInterval(timer)
        timer = undefined
      } else if (!timer) {
        timer = setInterval(() => setActive((index) => (index + 1) % images.length), 6000)
      }
    }
    sync()
    document.addEventListener("visibilitychange", sync)
    return () => {
      document.removeEventListener("visibilitychange", sync)
      if (timer) clearInterval(timer)
    }
  }, [images.length, reduceMotion])

  return (
    <section className="relative isolate min-h-[430px] overflow-hidden bg-slate-950 py-16 sm:min-h-[520px] sm:py-20">
      {images.map((src, index) => (
        <Image key={src} src={src} alt="" fill sizes="100vw" className={`object-cover transition-opacity duration-1000 ${index === active ? "opacity-100" : "opacity-0"}`} aria-hidden={index !== active} />
      ))}
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />
      {/* Existing 10,000 youth leaders vision text remains above overlays. */}
    </section>
  )
}
```

Replace the static vision `<section>` in `app/page.tsx` with `<RotatingVisionSection images={VISION_IMAGES} />`. Keep the existing 10,000 vision copy.

- [ ] **Step 2: Drive metric cards from shared data**

In `ImpactSection.tsx`, replace the local targets and values with `IMPACT_STATS`. Keep the existing icon/gradient presentation by mapping `key` to visual configuration. Render `Counter target={stat.value}` plus `stat.suffix`; confirm Awardees resolves to `2,000+`.

- [ ] **Step 3: Add the partner CTA**

After the partner-card grid in `app/page.tsx`, add:

```tsx
<div className="flex justify-center pt-2">
  <Button asChild className="rounded-full bg-slate-950 px-6 text-white hover:bg-orange-600">
    <Link href="/partnership">Partner with us <ArrowRight className="ml-2 h-4 w-4" /></Link>
  </Button>
</div>
```

- [ ] **Step 4: Render the approved five-person team**

Delete the local `TeamMember` type and `teamMembers` array from `app/page.tsx`. Map `TEAM_MEMBERS` and render `<PortraitImage src={member.image} name={member.name} sizes="(max-width: 640px) 72vw, (max-width: 1024px) 50vw, 20vw" />` for every member, allowing the wrapper to choose the photo or initial fallback. Change the gallery to native horizontal snapping on mobile and `sm:grid-cols-2 lg:grid-cols-5` at larger widths. Render anchors only when `linkedIn` exists.

- [ ] **Step 5: Verify content and layout compilation**

Run: `npx vitest run tests/site/impact-content.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the homepage supporting sections**

```bash
git add app/components/RotatingVisionSection.tsx app/components/ImpactSection.tsx app/page.tsx
git commit -m "feat: refresh homepage impact proof points"
```

---

### Task 5: Guarantee Individual Images for Homepage Stories

**Files:**
- Create: `lib/story-covers.ts`
- Create: `tests/site/story-covers.test.ts`
- Modify: `app/components/BlogSection.tsx`
- Modify: `components/BlogCover.tsx`

**Interfaces:**
- Produces: `resolveStoryCover(post: Pick<ResolvedPost, "slug" | "coverImage">, index: number): string`.
- Consumes: `ResolvedPost` from `lib/posts.ts`.
- Extends: `BlogCoverProps` with `alt?: string | null`.

- [ ] **Step 1: Write the failing fallback-policy tests**

```ts
// tests/site/story-covers.test.ts
import { describe, expect, it } from "vitest"
import { resolveStoryCover } from "@/lib/story-covers"

describe("resolveStoryCover", () => {
  it("prefers a real post cover", () => {
    expect(resolveStoryCover({ slug: "known", coverImage: "/custom.jpg" }, 0)).toBe("/custom.jpg")
  })

  it("replaces placeholder and missing covers with curated local images", () => {
    expect(resolveStoryCover({ slug: "one-young-world-partners-with-top100", coverImage: null }, 0)).toBe("/blog/Top100 Africa Future Leaders patners with one young world.png")
    expect(resolveStoryCover({ slug: "unmapped", coverImage: "/placeholder.svg" }, 1)).toBe("/IMG_0677.jpg")
  })

  it("is deterministic for any index", () => {
    expect(resolveStoryCover({ slug: "unmapped", coverImage: null }, 8)).toBe("/IMG_0681.jpg")
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/site/story-covers.test.ts`

Expected: FAIL because `lib/story-covers.ts` does not exist.

- [ ] **Step 3: Implement deterministic image resolution**

```ts
// lib/story-covers.ts
const SLUG_COVERS: Readonly<Record<string, string>> = {
  "one-young-world-partners-with-top100": "/blog/Top100 Africa Future Leaders patners with one young world.png",
  "from-first-class-graduate-to-global-leader": "/IMG_0680.jpg",
  "the-power-of-peer-networks": "/IMG_0672.jpg",
}

const CURATED_COVERS = [
  "/IMG_0674.jpg",
  "/IMG_0677.jpg",
  "/IMG_0679.jpg",
  "/IMG_0681.jpg",
  "/IMG_0683.jpg",
] as const

function isUsableCover(coverImage?: string | null): coverImage is string {
  return Boolean(coverImage && !coverImage.startsWith("/placeholder"))
}

export function resolveStoryCover(
  post: { slug: string; coverImage?: string | null },
  index: number,
): string {
  if (isUsableCover(post.coverImage)) return post.coverImage
  return SLUG_COVERS[post.slug] ?? CURATED_COVERS[Math.abs(index) % CURATED_COVERS.length]
}
```

- [ ] **Step 4: Pass resolved cover and accurate alt text**

In `BlogSection.tsx`:

```tsx
<BlogCover
  imageUrl={resolveStoryCover(post, index)}
  title={post.title}
  alt={post.coverImageAlt ?? post.title}
  className="transition duration-500 group-hover:scale-105"
  sizes="(max-width: 640px) 112px, (max-width: 1200px) 50vw, 33vw"
/>
```

In `BlogCover.tsx`, add `alt?: string | null` and use `alt={alt ?? title}` on `Image`. Keep the branded fallback for unexpected runtime image failures but do not select it for known homepage stories.

Convert `BlogCover.tsx` to a client component and track image failure explicitly:

```tsx
"use client"

const [imageFailed, setImageFailed] = useState(false)
useEffect(() => setImageFailed(false), [imageUrl])
const showImage = hasRealCover(imageUrl) && !imageFailed

<Image
  src={imageUrl!}
  alt={alt ?? title}
  fill
  className="object-cover"
  priority={priority}
  sizes={sizes ?? DEFAULT_SIZES[variant]}
  onError={() => setImageFailed(true)}
/>
```

- [ ] **Step 5: Run tests and type checking**

Run: `npx vitest run tests/site/story-covers.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit story imagery**

```bash
git add lib/story-covers.ts tests/site/story-covers.test.ts app/components/BlogSection.tsx components/BlogCover.tsx
git commit -m "fix: give homepage stories individual cover images"
```

---

### Task 6: Remove the Glitchy Awardee Auto-Scroll

**Files:**
- Modify: `app/components/HomeFeaturedAwardees.tsx`

**Interfaces:**
- Consumes: unchanged `Props` and `SpotlightAwardee` shapes.
- Produces: the same awardee cards and routes through a native scroll-snap container.

- [ ] **Step 1: Remove timer and pointer-listener state**

Delete `isMobile`, `scrollPosition`, the resize effect, the interval effect, duplicated awardee records, `document.querySelector`, document-level mouse/touch handlers, and all transform-width arithmetic. Keep only `imageErrors` and `safeAwardees` state/computation.

- [ ] **Step 2: Replace both branches with one native gallery**

```tsx
<div
  aria-label="Featured awardees"
  className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
>
  {safeAwardees.map((awardee, index) => (
    <Link
      key={awardee.slug}
      href={`/awardees/${awardee.slug}`}
      className="group w-[72vw] max-w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:w-52"
    >
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        {awardee.avatar_url && !imageErrors.has(awardee.slug) ? (
          <Image
            src={awardee.avatar_url}
            alt={awardee.name}
            fill
            sizes="220px"
            className="object-cover"
            priority={index < 3}
            onError={() => setImageErrors((previous) => new Set(previous).add(awardee.slug))}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary">
            <AvatarSVG name={awardee.name} size={48} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold capitalize">{awardee.name}</h3>
        {awardee.course ? <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{awardee.course}</p> : null}
        {awardee.cgpa ? <p className="mt-3 text-sm font-semibold text-primary">CGPA {awardee.cgpa}</p> : null}
      </div>
    </Link>
  ))}
</div>
```

Do not use `target="_blank"`; awardee profiles remain in the same site flow. Retain the “View All Awardees” CTA.

- [ ] **Step 3: Run type checking and lint-equivalent checks**

Run: `npm run typecheck && npx eslint app/components/HomeFeaturedAwardees.tsx`

Expected: PASS with no unused state/effect imports.

- [ ] **Step 4: Commit the stable carousel**

```bash
git add app/components/HomeFeaturedAwardees.tsx
git commit -m "fix: stabilize featured awardee scrolling"
```

---

### Task 7: Build the Impact Hub

**Files:**
- Create: `app/impacts/page.tsx`
- Modify: `lib/og-pages.ts`

**Interfaces:**
- Consumes: `IMPACT_HERO`, `IMPACT_STATS`, `getFeaturedSpeakers`, `getAwardees`, `getHomepagePosts`, `resolveStoryCover`, and `galleryImages`.
- Produces: server-rendered `/impacts` page and page metadata.

- [ ] **Step 1: Implement server data selection**

```tsx
export const revalidate = 300

export async function getImpactPageData() {
  const [awardees, posts] = await Promise.all([getAwardees(), getHomepagePosts()])
  const featuredAwardees = [...awardees.filter((entry) => entry.featured), ...awardees.filter((entry) => !entry.featured)].slice(0, 6)
  const stories = posts.slice(0, 3)
  const moments = galleryImages.slice(0, 6)
  return { featuredAwardees, stories, moments }
}
```

Use these selected arrays directly in the section markup specified in Steps 2–5; do not introduce client-side fetching or a second content cache.

- [ ] **Step 2: Add the impact-hub editorial hero and metrics**

Add this entry to `PAGE_OG`, then export page metadata using `ogMetadata(pageOg("/impacts"), { url: "/impacts" })` and canonical `${SITE_URL}/impacts`:

```ts
"/impacts": {
  eyebrow: "Impact Beyond Recognition",
  title: "Celebrating the Work Beyond the Award",
  subtitle: "Leaders, stories, and moments creating lasting change across Africa.",
  hero: "/IMG_0679.jpg",
},
```

The hero repeats the approved theme without copying the homepage layout. Use a split composition: left-aligned approved copy and CTAs, with `/IMG_0679.jpg` as the dominant event photograph. Render the shared three metrics immediately below in a compact black strip. Links are “Explore leaders” → `#leaders` and “Partner with us” → `/partnership`.

- [ ] **Step 3: Add Hall of Fame and awardee spotlight sections**

Render `<HallOfFamePreview speakers={getFeaturedSpeakers()} />`. Render up to six awardees in `section#leaders` using their existing slug/name/country/bio/avatar fields. Each card links to `/awardees/${slug}` and uses `AvatarSVG` when `avatar_url` is absent.

- [ ] **Step 4: Add stories, event moments, and interview pathway**

Render three published posts with `resolveStoryCover(post, index)` and links to `/blog/${post.slug}`. Render the first six `galleryImages` in a varied but responsive grid using their `src`, `alt`, and `caption`. Add a black editorial panel linking to `/interviews` with:

```tsx
<p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-400">Impact interviews</p>
<h2 className="mt-4 text-3xl font-semibold text-white sm:text-5xl">Hear the work behind the recognition.</h2>
<p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Awardees share the decisions, setbacks, and community work shaping their journeys.</p>
<Link href="/interviews" className="mt-7 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-semibold text-white">Watch the interviews <ArrowRight className="h-4 w-4" /></Link>
```

- [ ] **Step 5: Add the closing pathway**

Close with two explicit destinations: “Partner with us” → `/partnership` and “Meet all awardees” → `/awardees`.

- [ ] **Step 6: Verify the page build**

Run: `npm run typecheck && npm run build`

Expected: PASS and `/impacts` appears in build output.

- [ ] **Step 7: Commit the impact hub**

```bash
git add app/impacts/page.tsx lib/og-pages.ts
git commit -m "feat: launch the impact stories hub"
```

---

### Task 8: Update Metadata and Complete Browser Verification

**Files:**
- Modify: `lib/og-pages.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: static route metadata helpers already used by the project.
- Produces: the updated awardee share-card count and current global metadata.

- [ ] **Step 1: Update the awardee share card and verify new-route cards**

Update `/awardees` subtitle from “400+ awardees” to “2,000+ awardees.” Confirm the `/impacts` and `/hall-of-fame` entries added in Tasks 7 and 3 remain present. Dynamic speaker pages call `ogMetadata` inside `generateMetadata`, so they do not require a dynamic `PAGE_OG` key.

- [ ] **Step 2: Remove stale global application language**

In `app/layout.tsx`, change the default title/description and Open Graph/Twitter descriptions to impact-led language. Use this description consistently:

```ts
"Meet 2,000+ awardees and the speakers, partners, and stories turning recognition into lasting impact across Africa."
```

Change the home OG alt text to “Top100 Africa Future Leaders — Celebrating Impact Beyond Recognition.” Do not change application-route metadata in this task.

- [ ] **Step 3: Run the complete automated verification set**

Run:

```bash
npx vitest run tests/site tests/og/og-coverage.test.ts tests/og/og-pages.test.ts
npm run typecheck
npm run build
```

Expected: all commands PASS. If build is blocked only by unavailable external services, record the exact service failure and verify the four routes against the running dev server instead.

- [ ] **Step 4: Verify homepage behavior at mobile width**

At `http://localhost:3000/` with a 398×814 viewport, confirm:

- Only the logo and menu trigger occupy the compact header.
- The hero contains no “applications open,” “Apply now,” or persistent “Get Started.”
- Both hero CTAs navigate correctly.
- Hall of Fame appears before About.
- The vision image remains visible through the lighter overlay and changes without flicker.
- “2,000+ Awardees” is visible.
- Partner CTA navigates to `/partnership`.
- Every story card has a distinct photographic image.
- Awardees scroll by touch/native scrolling without a reset jump.
- Team shows five members and no Chinedu entry.
- The page has no horizontal document overflow.

- [ ] **Step 5: Verify new routes and responsive desktop behavior**

At 1440×900, inspect `/`, `/impacts`, `/hall-of-fame`, and `/hall-of-fame/ruby-igwe`. Confirm valid images, visible focus outlines, profile links, gallery layout, readable overlay text, and no 404s. Also verify an unknown `/hall-of-fame/not-a-speaker` slug returns 404.

- [ ] **Step 6: Verify reduced-motion behavior**

Enable reduced motion in browser emulation and reload `/`. Confirm the hero does not replay or flash, the vision image does not auto-rotate, native galleries remain manually scrollable, and no content disappears because an animation is disabled.

- [ ] **Step 7: Commit metadata and verification fixes**

```bash
git add lib/og-pages.ts app/layout.tsx
git commit -m "chore: complete impact experience metadata and verification"
```

Review `git diff --cached --name-only` before committing to ensure unrelated worktree files are excluded. If a browser check reveals a defect in a previously committed feature file, amend the task-specific commit for that file rather than broad-staging the repository.
