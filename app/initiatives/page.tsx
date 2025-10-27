import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define the initiative type
type Initiative = {
  title: string;
  description: string;
  href: string;
  colorClass: string;
};

// Define all initiatives with their corresponding color classes
const initiatives: Initiative[] = [
  {
    title: "Project100 Scholarship",
    description: "Backing mission-driven undergraduates with funding, mentors, and global exposure.",
    href: "/initiatives/project100",
    colorClass: "bg-blue-50/80 dark:bg-blue-950/20",
  },
  {
    title: "Talk100 Live",
    description: "Monthly conversations with policymakers and pioneers tackling Africa's biggest challenges.",
    href: "/initiatives/talk100-live",
    colorClass: "bg-purple-50/80 dark:bg-purple-950/20",
  },
  {
    title: "Future Leaders Summit",
    description: "Immersive leadership summit connecting awardees, partners, and investors.",
    href: "/initiatives/summit",
    colorClass: "bg-amber-50/80 dark:bg-amber-950/20",
  },
  {
    title: "Opportunities Hub",
    description: "Career opportunities, grants, and fellowships curated for young African leaders.",
    href: "/initiatives/opportunities",
    colorClass: "bg-emerald-50/80 dark:bg-emerald-950/20",
  },
];

export default function InitiativesPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container">
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Initiatives</h1>
          <p className="text-lg text-muted-foreground">
            Each initiative unlocks mentorship, funding, and opportunities tailored for Africa's youth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {initiatives.map((initiative) => (
            <Link
              key={initiative.title}
              href={initiative.href}
              className={`group rounded-[28px] border border-border/40 p-8 shadow-lg transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl flex flex-col h-full min-h-[280px] ${initiative.colorClass}`}
            >
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">
                  {initiative.title}
                </h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {initiative.description}
                </p>
              </div>
              <div className="flex justify-between items-center mt-auto pt-4">
                <Button variant="link" className="p-0 h-auto text-primary hover:text-primary/80 group">
                  Learn more
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </Link>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-16 text-center">
          <h2 className="text-3xl font-bold mb-6">About Our Movement</h2>
          <p className="text-lg text-muted-foreground mb-8">
            We celebrate undergraduates rewriting what leadership looks like across the continent. 
            From Lagos to Kigali, our awardees transform bold ideas into movements that uplift 
            communities and open doors for their peers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/africa-future-leaders">Explore Our Story</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/awardees">Meet Our Awardees</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}