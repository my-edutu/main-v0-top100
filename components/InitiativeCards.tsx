"use client";

import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Mic, Sparkles, MapPin } from "lucide-react";
import Link from "next/link";

interface InitiativeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaText: string;
  href: string;
  gradientClass: string;
}

const InitiativeCard = ({
  icon,
  title,
  description,
  ctaText,
  href,
  gradientClass
}: InitiativeCardProps) => {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -10 }}
        className={`rounded-2xl p-0.5 ${gradientClass} shadow-lg transition-all duration-300 cursor-pointer`}
      >
        <div className="h-full rounded-2xl bg-white/90 p-6 dark:bg-black/90">
          <div className="mb-4 text-3xl text-primary">{icon}</div>
          <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">{description}</p>
          <div className="mt-auto flex justify-end">
            <div className="inline-flex items-center text-sm font-medium text-slate-900 hover:text-primary dark:text-white dark:hover:text-primary">
              <span>{ctaText}</span>
              <motion.span
                className="ml-2"
                whileHover={{ x: 5 }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

const InitiativeCards = () => {
  const initiatives = [
    {
      icon: <GraduationCap className="h-8 w-8" />,
      title: "Project100 Scholarship",
      description: "Backing students with micro-grants, mentorship, and proof-based selection to keep talent in school.",
      ctaText: "Learn more",
      href: "/initiatives/project100",
      gradientClass: "bg-gradient-to-br from-green-500 to-teal-400"
    },
    {
      icon: <Mic className="h-8 w-8" />,
      title: "Talk100 Live",
      description: "Monthly live interviews with awardees and mentors—real stories, practical playbooks, open Q&A.",
      ctaText: "Watch episodes",
      href: "/initiatives/talk100",
      gradientClass: "bg-gradient-to-br from-blue-500 to-purple-500"
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: "Future Leaders Summit",
      description: "Flagship gathering of young innovators—keynotes, panels, and deal rooms for collaboration.",
      ctaText: "Explore the summit",
      href: "/initiatives/summit",
      gradientClass: "bg-gradient-to-br from-orange-500 to-amber-400"
    },
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "Opportunities Hub",
      description: "Curated scholarships, fellowships, and programs for African youth—updated weekly, tailored by interest.",
      ctaText: "Browse opportunities",
      href: "/initiatives/opportunities",
      gradientClass: "bg-gradient-to-br from-pink-500 to-violet-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {initiatives.map((initiative, index) => (
        <InitiativeCard
          key={index}
          icon={initiative.icon}
          title={initiative.title}
          description={initiative.description}
          ctaText={initiative.ctaText}
          href={initiative.href}
          gradientClass={initiative.gradientClass}
        />
      ))}
    </div>
  );
};

export default InitiativeCards;