export const IMPACT_HERO = {
  eyebrow: "Our 2026 Focus",
  title: "Celebrating Impact Beyond Recognition",
  description:
    "Recognition is only the beginning. Discover the leaders turning achievement into lasting change across Africa.",
  primaryCta: { label: "Explore the impact", href: "/impacts" },
  secondaryCta: { label: "Meet the leaders", href: "/hall-of-fame" },
} as const

export type ImpactHero = typeof IMPACT_HERO

export const IMPACT_STATS = [
  { key: "countries", label: "Countries", description: "Across Africa", value: 31, suffix: "+" },
  { key: "lives", label: "Lives impacted", description: "Across Africa", value: 97000, suffix: "" },
  { key: "awardees", label: "Awardees", description: "Across Africa", value: 2000, suffix: "+" },
] as const

export type ImpactStats = typeof IMPACT_STATS

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
