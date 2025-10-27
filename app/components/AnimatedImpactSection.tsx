"use client";

import { Globe, Users, Award, Handshake } from "lucide-react";

const AnimatedImpactSection = () => {
  const impactStats = [
    {
      icon: <Globe className="w-8 h-8" />,
      label: "Countries",
      value: "31+",
      description: "Across the world",
    },
    {
      icon: <Users className="w-8 h-8" />,
      label: "Global Impact",
      value: "97,000",
      description: "Lives touched and inspired",
    },
    {
      icon: <Award className="w-8 h-8" />,
      label: "Awardees",
      value: "400+",
      description: "Future leaders recognized",
    },
    {
      icon: <Handshake className="w-8 h-8" />,
      label: "Global Partners",
      value: "3",
      description: "Strategic collaborations",
    },
  ];

  return (
    <section className="relative py-12 bg-slate-100/80 dark:bg-zinc-900/50 transition-colors duration-300">
      <div className="absolute inset-0 bg-grid-slate-300/[0.2] bg-[size:40px_40px] dark:bg-grid-white/[0.02]" />
      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="mb-4 text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-orange-500 dark:from-white dark:to-orange-300 md:text-4xl">
            Our Impact
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-slate-600 dark:text-zinc-400">
            Celebrating achievements and creating opportunities across Africa
          </p>
        </div>

        {/* Mobile view: Scrollable cards */}
        <div className="-mx-2 overflow-x-auto px-2 py-4 scrollbar-hide md:hidden">
          <div className="flex min-w-max space-x-4">
            {impactStats.map((stat, index) => (
              <div 
                key={`mobile-${stat.label}-${index}`} 
                className="flex-shrink-0 w-44 rounded-2xl border border-orange-400/20 bg-white/90 p-4 text-slate-700 backdrop-blur-lg shadow-sm dark:bg-black/50 dark:text-zinc-100"
              >
                <div className="mb-2 flex justify-center text-orange-400">{stat.icon}</div>
                <div className="mb-1 text-center font-sans text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="mb-1 text-center text-sm font-semibold text-slate-600 dark:text-zinc-200">{stat.label}</div>
                <div className="text-center text-xs text-slate-500 dark:text-zinc-400">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop view: Continuous sliding cards */}
        <div className="hidden overflow-hidden py-6 md:block">
          <div className="animate-infinite-scroll">
            {[...impactStats, ...impactStats, ...impactStats].map((stat, index) => (
              <div 
                key={`${stat.label}-${index}`} 
                className="mx-3 flex-shrink-0 w-52 rounded-2xl border border-orange-400/20 bg-white/90 p-5 text-slate-700 backdrop-blur-lg shadow-sm transition hover:border-orange-400/40 dark:bg-black/50 dark:text-zinc-100"
              >
                <div className="mb-3 flex justify-center text-orange-400">{stat.icon}</div>
                <div className="mb-2 text-center font-sans text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="mb-1 text-center text-sm font-semibold text-slate-600 dark:text-zinc-200">{stat.label}</div>
                <div className="text-center text-xs text-slate-500 dark:text-zinc-400">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Add the CSS animation for infinite scrolling
const InfiniteScrollStyle = () => (
  <style jsx global>{`
    @keyframes infinite-scroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-100%);
      }
    }
    
    .animate-infinite-scroll {
      display: flex;
      animation: infinite-scroll 30s linear infinite;
    }
    
    .animate-infinite-scroll:hover {
      animation-play-state: paused;
    }
    
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
  `}</style>
);

export { AnimatedImpactSection, InfiniteScrollStyle };
