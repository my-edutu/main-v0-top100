import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from 'next';
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Our Initiatives - Scholarships, Summits & Opportunities",
  description: "Explore Top100 Africa Future Leaders initiatives: Project100 Scholarship, Future Leaders Summit, Talk100 Live, and the Opportunities Hub. Unlock mentorship, funding, and global opportunities for African youth leaders.",
  keywords: [
    "African scholarships",
    "leadership summit Africa",
    "Project100 scholarship",
    "African youth opportunities",
    "leadership development programs",
    "African student funding",
    "mentorship programs Africa",
    "career opportunities Africa",
    "youth empowerment initiatives"
  ],
  openGraph: {
    title: "Top100 Africa Future Leaders Initiatives",
    description: "Unlock mentorship, funding, and opportunities through our initiatives: Project100 Scholarship, Future Leaders Summit, Talk100 Live, and Opportunities Hub.",
    images: ['/magazine-cover-2025.jpg'],
    url: "https://www.top100afl.org/initiatives",
  },
};

// Define the initiative type
type Initiative = {
  title: string;
  description: string;
  href: string;
  badge: string;
  image: string;
  alt: string;
  imagePosition?: string;
  wide?: boolean;
  tint: string;
};

// Define all initiatives with their corresponding color classes
const initiatives: Initiative[] = [
  {
    title: "Project100 Scholarship",
    description: "Backing mission-driven undergraduates with funding, mentors, and global exposure.",
    href: "/initiatives/project100",
    badge: "Funding",
    image: "/top100 magazine.webp",
    alt: "Top100 Africa Future Leaders magazine cover",
    imagePosition: "center 24%",
    tint: "from-slate-950/80 via-slate-900/40 to-slate-950/15",
  },
  {
    title: "Talk100 Live",
    description: "Monthly conversations with policymakers and pioneers tackling Africa's biggest challenges.",
    href: "/initiatives/talk100-live",
    badge: "Conversation",
    image: "/young-african-man-business-leader.jpg",
    alt: "Young African business leader portrait",
    imagePosition: "center 18%",
    tint: "from-violet-950/80 via-violet-900/35 to-slate-950/10",
  },
  {
    title: "Future Leaders Summit 2025",
    description: "Immersive leadership summit connecting awardees, partners, and investors.",
    href: "/initiatives/summit",
    badge: "Summit",
    image: "/top100-africa-future-leaders-2024-magazine-cover-w.jpg",
    alt: "Top100 Africa Future Leaders magazine cover for the summit archive",
    imagePosition: "center center",
    tint: "from-amber-950/80 via-orange-900/35 to-slate-950/15",
  },
  {
    title: "Opportunities Hub",
    description: "Career opportunities, grants, and fellowships curated for young African leaders.",
    href: "/initiatives/opportunities",
    badge: "Opportunities",
    image: "/magazine-cover-2025.jpg",
    alt: "Top100 Africa Future Leaders 2025 magazine cover",
    imagePosition: "center 20%",
    tint: "from-emerald-950/80 via-teal-900/35 to-slate-950/10",
  },
  {
    title: "African Future Leaders Magazine",
    description: "Curated stories and insights from Africa's emerging leaders and changemakers.",
    href: "/magazine/afl2025",
    badge: "Editorial",
    image: "/Africa Future leaders festival.png",
    alt: "Africa Future Leaders festival and magazine artwork",
    imagePosition: "center center",
    wide: true,
    tint: "from-rose-950/80 via-fuchsia-900/35 to-slate-950/10",
  },
];

export default function InitiativesPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf7f1_0%,#ffffff_44%,#f4efe6_100%)] py-12">
      <div className="container">
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Initiatives</h1>
          <p className="text-lg text-muted-foreground">
            Each initiative unlocks mentorship, funding, and opportunities tailored for Africa's youth.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-6xl mx-auto">
          {initiatives.map((initiative) => (
            <Link
              key={initiative.title}
              href={initiative.href}
              className={cn(
                "group relative isolate overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 text-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.42)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_85px_-36px_rgba(15,23,42,0.52)]",
                initiative.wide && "md:col-span-2",
              )}
            >
              <div className="absolute inset-0">
                <Image
                  src={initiative.image}
                  alt={initiative.alt}
                  fill
                  sizes={initiative.wide ? "(max-width: 768px) 100vw, 100vw" : "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"}
                  className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  style={{ objectPosition: initiative.imagePosition ?? "center" }}
                  priority={initiative.title === "Project100 Scholarship"}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${initiative.tint} opacity-55`} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.42)_42%,rgba(2,6,23,0.9)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent" />
              </div>

              <div className="relative flex min-h-[300px] flex-col justify-between p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur-md">
                    {initiative.badge}
                  </span>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/90 backdrop-blur-md transition group-hover:bg-white/15">
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>

                <div className="max-w-xl space-y-3 rounded-[26px] border border-white/10 bg-black/35 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.38)] backdrop-blur-md sm:max-w-lg">
                  <h2 className="text-2xl font-semibold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-[2rem]">
                    {initiative.title}
                  </h2>
                  <p className="max-w-lg text-sm leading-7 text-white/80 sm:text-[0.98rem]">
                    {initiative.description}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/95 underline decoration-white/45 underline-offset-4">
                    Learn more
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>


      </div>
    </div>
  );
}
