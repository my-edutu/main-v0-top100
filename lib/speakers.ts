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
  { slug: "samuel-olarewaju", name: "Samuel Olarewaju", portrait: "/speakers/samuel olanrewaju.jpeg", label: "Top100 speaker", announcementArtwork: "/speakers announcement/11.png", eventYears: [2025] },
  { slug: "damilola-babatunde", name: "Damilola Babatunde", portrait: "/speakers/damilola babatunde.jpeg", label: "Global Policy Advisor · Peace and Development Advocate", topic: "From Frustration to Global Recognition", announcementArtwork: "/speakers announcement/12.png", bioArtwork: "/speakers bio/19.png", eventYears: [2025] },
  { slug: "tochukwu-idinmachi", name: "Tochukwu Idinmachi", portrait: "/speakers/tochukwu idinmachi.jpeg", label: "Top100 speaker", topic: "The Power of Voice in Leadership", announcementArtwork: "/speakers announcement/13.png", bioArtwork: "/speakers bio/15.png", eventYears: [2025] },
  { slug: "belinda-nkechi-idinmachi", name: "Belinda Nkechi Idinmachi", portrait: "/speakers/belinda nkechi.jpeg", label: "Coordinating Ambassador, One Young World West & Central Africa", topic: "Building Online Credibility That Attracts Opportunities", announcementArtwork: "/speakers announcement/13.png", bioArtwork: "/speakers bio/31.png", eventYears: [2025] },
  { slug: "leye-falade", name: "Leye Falade", portrait: "/speakers/Leye Falade.jpeg", label: "Global Energy Executive · Managing Director, Brunei LNG", topic: "How to Think Like a Problem Solver in Africa", announcementArtwork: "/speakers announcement/14.png", bioArtwork: "/speakers bio/17.png", eventYears: [2025] },
  { slug: "yetunde-shado-asekun", name: "Yetunde Shado-Asekun", portrait: "/speakers/yetunde asekun.jpeg", label: "Top100 speaker", topic: "From Applicant to Asset: Building Value Before Getting Employed", announcementArtwork: "/speakers announcement/14.png", bioArtwork: "/speakers bio/35.png", eventYears: [2025] },
]

export const FEATURED_SPEAKER_SLUGS = [
  "leye-falade",
  "ruby-igwe",
  "belinda-nkechi-idinmachi",
  "odinakachi-umunna",
  "lungile-tlomatsana",
  "kaitochukwu-chukwudi",
  "samuel-olarewaju",
  "damilola-babatunde",
  "tochukwu-idinmachi",
  "yetunde-shado-asekun",
] as const

export function getSpeaker(slug: string): Speaker | undefined {
  return SPEAKERS.find((speaker) => speaker.slug === slug)
}

export function getFeaturedSpeakers(): Speaker[] {
  return FEATURED_SPEAKER_SLUGS.map((slug) => getSpeaker(slug)).filter(
    (speaker): speaker is Speaker => Boolean(speaker),
  )
}
