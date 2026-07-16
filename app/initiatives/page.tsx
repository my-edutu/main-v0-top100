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
    url: "https://www.top100afl.com/initiatives",
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

        <div className="mx-auto max-w-6xl space-y-6">
          {initiatives.map((initiative, index) => {
            const imageFirst = index % 2 === 0
            return (
            <Link
              key={initiative.title}
              href={initiative.href}
              className={cn(
                "group grid overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_85px_-40px_rgba(15,23,42,0.25)]",
                "lg:grid-cols-[0.96fr_1.04fr]",
              )}
            >
              <div className={cn("relative min-h-[280px] overflow-hidden bg-slate-950 lg:min-h-[320px]", imageFirst ? "lg:order-1" : "lg:order-2")}>
                <Image
                  src={initiative.image}
                  alt={initiative.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  style={{ objectPosition: initiative.imagePosition ?? "center" }}
                  priority={initiative.title === "Project100 Scholarship"}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${initiative.tint} opacity-55`} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.42)_42%,rgba(2,6,23,0.9)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent" />
              </div>

              <div className={cn("flex min-h-[280px] flex-col justify-between gap-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,246,238,0.96))] p-6 sm:p-8 lg:min-h-[320px] lg:p-10", imageFirst ? "lg:order-2" : "lg:order-1")}>
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-700">
                    {initiative.badge}
                  </span>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-600 shadow-sm transition group-hover:bg-orange-50">
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>

                <div className="space-y-3">
                  <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                    {initiative.title}
                  </h2>
                  <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-[0.98rem]">
                    {initiative.description}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 underline decoration-orange-200 underline-offset-4">
                    Learn more
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          )})}
        </div>


      </div>
    </div>
  );
}
