export type Speaker = {
  slug: string
  name: string
  portrait: string
  label: string
  profile: string
  topic?: string
  impact?: string
  announcementArtwork?: string
  bioArtwork?: string
  youtubeUrl?: string
  eventYears: readonly number[]
}

export const SPEAKERS: readonly Speaker[] = [
  {
    slug: "ruby-igwe",
    name: "Ruby Igwe",
    portrait: "/speakers/Ruby Igwe.jpeg",
    label: "Regional Director, West & Central Africa, ALX Africa · Co-Founder, Archivi.ng",
    profile:
      "Ruby Igwe is a technology and community leader building pathways into learning, entrepreneurship, and Nigeria’s public memory. She leads regional work at ALX Africa and co-founded Archivi.ng, a digital archive preserving Nigerian newspapers and making them easier for people to discover.",
    topic: "The 3 I’s of Leadership — Impact, Influence and Intellectualism",
    impact: "Ruby expands access to technology, entrepreneurship, and leadership education across West and Central Africa through ALX. Her work connects learning to opportunity at scale: ALX reports more than 130,000 graduates in Nigeria. She also co-founded Archivi.ng, a nonprofit preserving Nigerian history by digitising newspapers and making them searchable online. The archive has opened 75,607 pages to the public, turning fragile records into an accessible resource for researchers, journalists, educators, and citizens. Across both initiatives, Ruby builds infrastructure that helps people learn, remember, and participate more fully in Africa’s future.",
    announcementArtwork: "/speakers announcement/9.png",
    bioArtwork: "/speakers bio/2.png",
    eventYears: [2025],
  },
  {
    slug: "odinakachi-umunna",
    name: "Odinakachi Umunna",
    portrait: "/speakers/odinakachi umunna.jpeg",
    label: "Corporate Strategy Consultant, Shell International · Communications Chair, Future Energy Leaders Netherlands",
    profile:
      "Odinakachi Umunna is a corporate strategy and energy-transition professional who brings a systems view to the future of power. He works with Shell International and helps convene emerging energy leaders through the Future Energy Leaders Netherlands network.",
    impact: "Odinakachi works at the intersection of corporate strategy, energy transition, and youth leadership. At Shell International, he contributes to strategic thinking in a sector central to how economies grow and decarbonise. As Communications Chair for Future Energy Leaders Netherlands, part of the World Energy Council network, he helps emerging professionals exchange ideas about a more resilient energy system. His earlier Cycle for Light concept proposed using human-powered bicycle generators to bring electricity to off-grid schools in south-west Nigeria. The proposal reflects a practical approach to leadership: connect global energy conversations with locally relevant solutions.",
    announcementArtwork: "/speakers announcement/10.png",
    eventYears: [2025],
  },
  {
    slug: "lungile-tlomatsana",
    name: "Lungile Tlomatsana",
    portrait: "/speakers/lungile.jpeg",
    label: "Coordinating Ambassador, Southern Africa, One Young World · Community Builder",
    profile:
      "Lungile Tlomatsana is a community builder focused on the moments when young people need practical information, honest conversation, and a network that stays present. She coordinates One Young World’s Southern Africa ambassador community and creates spaces for early-career leaders to grow.",
    topic: "Crafting a Personal Brand That Opens Doors",
    impact: "Lungile builds communities that make opportunity easier to find and support more personal. Through One Young World, she connects ambassadors across Southern Africa and helps regional leaders collaborate beyond individual programmes. Her work has included mentoring and financial support for first-year students, the 411 career resource, and Hear Me Out, a conversation series designed to create room for honest dialogue. These initiatives meet young people at different points in their journeys—from entering university to navigating work and belonging. Lungile’s impact is grounded in turning networks into practical care, useful information, and sustained connection.",
    announcementArtwork: "/speakers announcement/10.png",
    bioArtwork: "/speakers bio/21.png",
    eventYears: [2025],
  },
  {
    slug: "kaitochukwu-chukwudi",
    name: "Kaitochukwu Chukwudi",
    portrait: "/speakers/kaitochukwu chukwudi.jpeg",
    label: "Energy Finance & Policy Professional, African Development Bank · Founder, The EnerGii Tribe",
    profile:
      "Kaitochukwu Chukwudi is an energy finance and policy professional translating technical questions into clearer choices about Africa’s power future. Alongside her work connected to the African Development Bank, she founded The EnerGii Tribe to help students and early-career professionals find their way into the energy sector.",
    topic: "The Psychology of Winning Global Opportunities",
    impact: "Kaitochukwu works where energy policy, finance, and access meet. At the African Development Bank, her work supports stakeholder engagement, policy, and financing connected to Mission 300, the effort to provide electricity access to 300 million Africans by 2030. She also founded The EnerGii Tribe as a learning community for people building careers and knowledge in energy. Her Cambridge research estimated a $32.6 billion sustainable-cooling investment opportunity for Nigeria by 2050. Together, these strands translate technical research into networks and decisions that can expand reliable, climate-aware energy access across the continent.",
    announcementArtwork: "/speakers announcement/11.png",
    bioArtwork: "/speakers bio/25.png",
    eventYears: [2025],
  },
  {
    slug: "samuel-olarewaju",
    name: "Samuel Olarewaju",
    portrait: "/speakers/samuel olanrewaju.jpeg",
    label: "Biomedical Researcher · Founder, Food and Genes Initiative · Co-Founder & Executive Director, SWIS Africa",
    profile:
      "Samuel Olarewaju is a biomedical researcher and public-health educator who believes scientific knowledge should travel beyond laboratories. He founded Food and Genes Initiative and co-leads SWIS Africa, pairing evidence-led health communication with mentorship and visibility for African women in STEM.",
    impact: "Samuel combines biomedical research with public education and pathways into science. Through Food and Genes Initiative, his 365Days campaign has reached more than 70 schools and over 50,000 young people with health and nutrition information. Other campaigns report engagement with 5,000 people on malnutrition and 20,000 on non-communicable diseases. As Co-Founder and Executive Director of SWIS Africa, he also helps expand mentorship, visibility, and professional opportunities for African women in STEM. His work connects evidence with community action, making scientific knowledge more useful while widening who can participate in producing it.",
    announcementArtwork: "/speakers announcement/11.png",
    eventYears: [2025],
  },
  {
    slug: "damilola-babatunde",
    name: "Damilola Babatunde",
    portrait: "/speakers/damilola babatunde.jpeg",
    label: "Founder & Executive Director, Young Changemakers Foundation · Youth Policy & Sustainable-Development Practitioner",
    profile:
      "Damilola Babatunde is a youth-policy practitioner and civic entrepreneur creating routes for young people to shape decisions, not simply receive services. Through Young Changemakers Foundation, he works across education, technology, skills, networks, and policy to help youth-led ideas become durable public action.",
    topic: "From Frustration to Global Recognition",
    impact: "Damilola creates routes for young people—especially those from marginalised communities—to participate in public life and sustainable development. Through Young Changemakers Foundation and its Youth Lead work, he combines civic education, technology, skills, networks, and access to funding so young Nigerians can move from ideas to action. His wider policy contribution includes service on the Youth at Heart Advisory Committee and participation in the UNOPS Youth Engagement Platform. Across community programmes and international policy spaces, he works to ensure youth are not treated only as beneficiaries, but as informed partners shaping the decisions that affect them.",
    announcementArtwork: "/speakers announcement/12.png",
    bioArtwork: "/speakers bio/19.png",
    eventYears: [2025],
  },
  {
    slug: "tochukwu-idinmachi",
    name: "Tochukwu Idinmachi",
    portrait: "/speakers/tochukwu idinmachi.jpeg",
    label: "Shell professional · MBA · PMP-certified project leader",
    profile:
      "Tochukwu Idinmachi is a project leader with Shell experience, an MBA, and PMP certification. His leadership practice sits at the meeting point of delivery and communication: helping teams make complex work clearer while encouraging the next generation of professionals to find and use their voice.",
    topic: "The Power of Voice in Leadership",
    impact: "Tochukwu’s publicly documented impact centres on project leadership and support for emerging talent. A former SNEPCo intern credited him with guidance throughout a seven-month rotation, offering a concrete glimpse of how experienced professionals can make technical workplaces more navigable for those entering them. At Top100, his session, “The Power of Voice in Leadership,” explored communication as a practical leadership tool. Available public information does not establish a more specific current title, so this profile reflects only verified details: his Shell experience, MBA, PMP certification, mentorship, and contribution to leadership learning.",
    announcementArtwork: "/speakers announcement/13.png",
    bioArtwork: "/speakers bio/15.png",
    eventYears: [2025],
  },
  {
    slug: "belinda-nkechi-idinmachi",
    name: "Belinda Nkechi Idinmachi",
    portrait: "/speakers/belinda nkechi.jpeg",
    label: "Entrepreneurship Programme Specialist, ALX Africa · One Young World Coordinating Ambassador, West & Central Africa",
    profile:
      "Belinda Nkechi Idinmachi designs entrepreneurship programmes for founders who are ready to turn an idea into a working venture. She brings programme-building experience from ALX Africa and regional community leadership through One Young World, with a focus on inclusive access and practical momentum.",
    topic: "Building Online Credibility That Attracts Opportunities",
    impact: "Belinda designs entrepreneurship programmes that help founders move from ambition to execution. At ALX Founder Academy, her work has supported a programme representing 31% of graduates across eight markets, while female participation grew from 45% to 63% and the wider community expanded beyond 40,000 people. Earlier, she helped an incubator serve more than 1,000 entrepreneurs across 18 African countries. As a One Young World Coordinating Ambassador for West and Central Africa, she also strengthens connections among young leaders. Her impact combines programme design, inclusive participation, and regional networks that help founders build with greater confidence and reach.",
    announcementArtwork: "/speakers announcement/13.png",
    bioArtwork: "/speakers bio/31.png",
    eventYears: [2025],
  },
  {
    slug: "leye-falade",
    name: "Leye Falade",
    portrait: "/speakers/Leye Falade.jpeg",
    label: "Managing Director & CEO, Nigeria LNG Limited · Director, Nigerian Economic Summit Group",
    profile:
      "Leye Falade is an energy executive with nearly three decades of experience across LNG operations, commercial leadership, and governance. He now leads Nigeria LNG Limited and contributes to national economic dialogue through the Nigerian Economic Summit Group.",
    topic: "How to Think Like a Problem Solver in Africa",
    impact: "Leye leads Nigeria LNG at a defining point for the company and the country’s gas sector. He brings nearly three decades of energy and LNG experience to the role, including international leadership at Brunei LNG before returning to Nigeria on 1 April 2026. His work centres on safe execution, disciplined governance, and turning Nigeria’s gas resources into stronger energy security and industrial growth. As a Director of the Nigerian Economic Summit Group, he also contributes private-sector perspective to national economic dialogue. His leadership connects operational excellence with the longer-term institutions needed for durable development.",
    announcementArtwork: "/speakers announcement/14.png",
    bioArtwork: "/speakers bio/17.png",
    eventYears: [2025],
  },
  {
    slug: "yetunde-shado-asekun",
    name: "Yetunde Shado-Asekun",
    portrait: "/speakers/yetunde asekun.jpeg",
    label: "Head of Corrosion, JV Assets, TotalEnergies EP Nigeria · Corrosion Technical Authority",
    profile:
      "Yetunde Shado-Asekun is a corrosion engineer and technical authority protecting the reliability of complex energy assets. Her career spans Nigeria, France, and global projects, where she combines specialist engineering judgement with the standards, assurance, and knowledge-sharing that help teams make safer decisions.",
    topic: "From Applicant to Asset: Building Value Before Getting Employed",
    impact: "Yetunde strengthens the integrity of energy infrastructure through specialist corrosion engineering. Across 14 years of work in Nigeria, France, and global projects, she has contributed to material selection, corrosion mitigation, monitoring, and technical assurance. As Head of Corrosion for JV Assets at TotalEnergies EP Nigeria and a Corrosion Technical Authority, she helps teams manage risks that affect asset safety, reliability, and longevity. Her technical-authority and committee work also turns individual expertise into shared standards and stronger engineering practice. The result is quieter but essential impact: more resilient assets, better-informed decisions, and knowledge transferred across teams.",
    announcementArtwork: "/speakers announcement/14.png",
    bioArtwork: "/speakers bio/35.png",
    eventYears: [2025],
  },
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
