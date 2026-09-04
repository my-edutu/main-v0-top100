import type { OgCard } from "@/lib/og"

/**
 * The share card for every public static route.
 *
 * Two jobs: it supplies the card for pages whose header is fixed, and it is
 * the fallback hero for dynamic pages — a blog post with no cover image falls
 * back to the /blog hero rather than to the generic home card.
 *
 * Heroes are same-origin paths under public/. A route with no suitable
 * photograph is left without a hero on purpose and renders on the brand
 * gradient, which is a better card than an unrelated stock photo.
 */
export const PAGE_OG: Record<string, OgCard> = {
  "/afl2026": {
    eyebrow: "AFL 2026",
    title: "Africa Future Leaders Summit 2026",
    subtitle: "The continent's rising leaders, in one room.",
    hero: "/IMG_0673.jpg",
  },
  "/africa-future-leaders": {
    eyebrow: "About",
    title: "Africa Future Leaders",
    subtitle: "Recognising and backing the continent's most promising young people.",
    hero: "/IMG_0674.jpg",
  },
  "/ambassadors/card": {
    eyebrow: "Ambassadors",
    title: "Ambassador Share Card",
    hero: "/IMG_0680.jpg",
  },
  "/apply": {
    eyebrow: "Apply",
    title: "Apply for the 2026 Africa Future Leaders Program",
    subtitle: "Nominations and applications for the next cohort.",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
  "/awardees": {
    eyebrow: "Directory",
    title: "Meet the Top100 Africa Future Leaders",
    subtitle: "400+ awardees across 31 countries.",
    hero: "/top100 2024.webp",
  },
  "/awardees-list": {
    eyebrow: "Directory",
    title: "Full Awardees List",
    subtitle: "Every Top100 Africa Future Leader, by cohort.",
    hero: "/IMG_0675.jpg",
  },
  "/blog": {
    eyebrow: "Blog",
    title: "Stories & Insights from Africa's Future Leaders",
    subtitle: "Essays, partnership spotlights, and leadership lessons from the network.",
    hero: "/blog/Top100 Africa Future Leaders patners with one young world.png",
  },
  "/events": {
    eyebrow: "Events",
    title: "Events & Summits",
    subtitle: "Where the Top100 network meets.",
    hero: "/IMG_0672.jpg",
  },
  "/get-started": {
    eyebrow: "Apply",
    title: "Apply for Top100 Africa Future Leaders 2026",
    subtitle: "Start your application in a few minutes.",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
  "/hall-of-fame": {
    eyebrow: "Hall of Fame",
    title: "Leaders Who Chose Impact",
    subtitle: "The speakers who have inspired and supported the Top100 community.",
    hero: "/speakers/Ruby Igwe.jpeg",
  },
  "/impacts": {
    eyebrow: "Impact Beyond Recognition",
    title: "Celebrating the Work Beyond the Award",
    subtitle: "Leaders, stories, and moments creating lasting change across Africa.",
    hero: "/IMG_0679.jpg",
  },
  "/initiatives": {
    eyebrow: "Initiatives",
    title: "Our Initiatives — Scholarships, Summits & Opportunities",
    hero: "/IMG_0679.jpg",
  },
  "/initiatives/opportunities": {
    eyebrow: "Opportunities",
    title: "Opportunities for African Youth",
    subtitle: "Scholarships, fellowships, grants, and internships, in one place.",
    hero: "/IMG_0676.jpg",
  },
  "/initiatives/opportunities/fellowships": {
    eyebrow: "Opportunities",
    title: "Fellowships for African Youth",
    hero: "/IMG_0676.jpg",
  },
  "/initiatives/opportunities/grants": {
    eyebrow: "Opportunities",
    title: "Grants for African Youth",
    hero: "/IMG_0677.jpg",
  },
  "/initiatives/opportunities/internships": {
    eyebrow: "Opportunities",
    title: "Internships for African Youth",
    hero: "/IMG_0678.jpg",
  },
  "/initiatives/opportunities/scholarships": {
    eyebrow: "Opportunities",
    title: "Scholarships for African Youth",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
  "/initiatives/project100": {
    eyebrow: "Project 100",
    title: "Project 100",
    subtitle: "Backing one hundred young Africans through school and beyond.",
    hero: "/IMG_0679.jpg",
  },
  "/initiatives/project100/scholarship": {
    eyebrow: "Project 100",
    title: "Project 100 Scholarship",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
  "/initiatives/summit": {
    eyebrow: "Summit",
    title: "Africa Future Leaders Summit",
    hero: "/IMG_0672.jpg",
  },
  "/initiatives/summit/2024": {
    eyebrow: "Summit 2024",
    title: "Africa Future Leaders Summit 2024",
    hero: "/top100 2024.webp",
  },
  "/initiatives/summit/2025": {
    eyebrow: "Summit 2025",
    title: "Africa Future Leaders Summit 2025",
    hero: "/IMG_0681.jpg",
  },
  "/initiatives/summit/2026": {
    eyebrow: "Summit 2026",
    title: "Africa Future Leaders Summit 2026",
    hero: "/IMG_0673.jpg",
  },
  "/initiatives/talk100-live": {
    eyebrow: "Talk100 Live",
    title: "Talk100 Live",
    subtitle: "Conversations with the people building Africa's future.",
    hero: "/IMG_0682.jpg",
  },
  "/interviews": {
    eyebrow: "Interviews",
    title: "Impact Interviews",
    subtitle: "Awardees on the work behind the recognition.",
    hero: "/IMG_0683.jpg",
  },
  "/join": {
    eyebrow: "Join",
    title: "Join the Top100 Africa Future Leaders Network",
    hero: "/IMG_0684.jpg",
  },
  "/legal": {
    eyebrow: "Legal",
    title: "Legal",
  },
  "/legal/cookies": {
    eyebrow: "Legal",
    title: "Cookie Policy",
  },
  "/legal/privacy": {
    eyebrow: "Legal",
    title: "Privacy & Data Policy",
  },
  "/legal/terms": {
    eyebrow: "Legal",
    title: "Terms of Use",
  },
  "/login": {
    eyebrow: "Members",
    title: "Member Sign In",
  },
  "/magazine": {
    eyebrow: "Magazine",
    title: "The Top100 Africa Future Leaders Magazine",
    hero: "/magazine-cover-2025.jpg",
    variant: "cover",
  },
  "/magazine/afl2025": {
    eyebrow: "Magazine 2025",
    title: "Africa Future Leaders Magazine 2025",
    hero: "/magazine-cover-2025.jpg",
    variant: "cover",
  },
  "/magazine/africa future leaders magazine 2024": {
    eyebrow: "Magazine 2024",
    title: "Africa Future Leaders Magazine 2024",
    hero: "/top100-africa-future-leaders-2024-magazine-cover-w.jpg",
    variant: "cover",
  },
  "/partners": {
    eyebrow: "Partners",
    title: "Our Partners",
    subtitle: "The organisations backing Africa's next generation of leaders.",
    hero: "/IMG_0685.jpg",
  },
  "/partnership": {
    eyebrow: "Partnership",
    title: "Partner with Top100 Africa Future Leaders",
    subtitle: "Reach 10,000+ of Africa's most promising young people.",
    hero: "/IMG_0678.jpg",
  },
  "/signup": {
    eyebrow: "Members",
    title: "Claim Your Awardee Profile",
  },
  "/waitlist": {
    eyebrow: "Waiting List",
    title: "Join the Top100 Waiting List",
    subtitle: "Be first to know when our programmes open for registration.",
    hero: "/IMG_0672.jpg",
  },
  // Section fallbacks for dynamic routes whose records may carry no image.
  "/announcements": {
    eyebrow: "Announcement",
    title: "Announcements",
    hero: "/IMG_0680.jpg",
  },
  "/apply/[type]": {
    eyebrow: "Apply",
    title: "Application",
    hero: "/african-students-celebrating-achievement-at-gradua.jpg",
  },
}

export function pageOg(route: string): OgCard {
  const card = PAGE_OG[route]
  if (!card) {
    throw new Error(`No OG card registered for route "${route}". Add it to lib/og-pages.ts.`)
  }
  return card
}
