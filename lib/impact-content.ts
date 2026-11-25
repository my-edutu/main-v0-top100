export const IMPACT_HERO = {
  eyebrow: "Our 2026 Focus",
  title: "Celebrating Impact Beyond Recognition",
  description:
    "Recognition is only the beginning. Discover the leaders turning achievement into lasting change across Africa.",
  primaryCta: { label: "Explore the impact", href: "/impacts" },
  secondaryCta: { label: "Partner with us", href: "/partnership" },
} as const

export type ImpactHero = typeof IMPACT_HERO

export type AwardeeRegisterTotals = {
  awardees: number
  countries: number
  institutions: number
}

export type ImpactStat = {
  key: "countries" | "institutions" | "awardees"
  label: string
  description: string
  value: number
}

export type ImpactStats = readonly ImpactStat[]

// Keep the approved reach totals while historical country and institution records are backfilled.
const approvedReach = { countries: 100, institutions: 707 }

export function getImpactStats(register: AwardeeRegisterTotals | null): ImpactStats {
  const stats: ImpactStat[] = [
    {
      key: "countries",
      label: "Countries",
      description: "Represented worldwide",
      value: Math.max(approvedReach.countries, register?.countries ?? 0),
    },
    {
      key: "institutions",
      label: "Institutions",
      description: "Represented in our network",
      value: Math.max(approvedReach.institutions, register?.institutions ?? 0),
    },
  ]
  if (register) {
    stats.push({ key: "awardees", label: "Awardees", description: "Across all cohorts", value: register.awardees })
  }
  return stats
}

export type TeamMember = { name: string; role: string; image?: string; linkedIn?: string }

export const TEAM_MEMBERS: readonly TeamMember[] = [
  {
    name: "Nwosu Paul Light",
    role: "Founder",
    image: "/team/Paul light.jpg.png",
    linkedIn: "https://www.linkedin.com/in/paul-light-/",
  },
  {
    name: "Emmanuella Igboafu",
    role: "Team Lead",
    image: "/team/emmanuella igboafu.jpg",
    linkedIn: "https://www.linkedin.com/in/emmanuellaigboafu/",
  },
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

export type VisionImages = typeof VISION_IMAGES
