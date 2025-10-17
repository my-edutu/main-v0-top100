"use client";

import Image from "next/image";

const AnimatedPartnersSection = () => {
  const partners = [
    {
      name: "One Young World Africa & Middle East",
      logo: "/3.png",
      alt: "One Young World Africa and Middle East logo",
      description:
        "Partners with youth-led initiatives accelerating leadership, innovation, and social impact across the continent.",
    },
    {
      name: "ALX",
      logo: "/7.png",
      alt: "ALX logo",
      description:
        "Driving Africa's digital transformation by developing tech talent and empowering the next generation of builders.",
    },
    {
      name: "Learning Planet Institute",
      logo: "/6.png",
      alt: "Learning Planet Institute logo",
      description:
        "Co-creating learning ecosystems with UNESCO to nurture problem-solvers tackling humanity's biggest challenges.",
    },
  ];

  return (
    <section className="relative overflow-hidden py-10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-500/25 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-cyan-500/10 to-transparent" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="text-center mb-8">
          <span className="inline-flex items-center px-4 py-1 rounded-full border border-cyan-300/40 text-cyan-200 text-xs tracking-[0.2em] uppercase">
            Partners
          </span>
          <h2 className="mt-4 text-2xl md:text-3xl font-bold text-white">
            Building Africa's future with visionary allies
          </h2>
          <p className="mt-3 text-sm md:text-base text-zinc-300 max-w-2xl mx-auto">
            These partners amplify our mission, unlocking opportunities and resources for Africa's boldest innovators.
          </p>
        </div>

        {/* Mobile view: Scrollable partners */}
        <div className="md:hidden overflow-x-auto py-4 px-2 -mx-2 scrollbar-hide">
          <div className="flex space-x-4 min-w-max">
            {partners.map((partner, index) => (
              <div
                key={`mobile-${partner.name}-${index}`}
                className="flex-shrink-0 w-60 group relative overflow-hidden rounded-3xl border border-cyan-500/10 bg-white/[0.03] backdrop-blur-md"
              >
                <div className="absolute top-0 left-0 h-px w-2/3 bg-gradient-to-r from-cyan-400/50 to-transparent" />
                <div className="flex flex-col items-center px-4 py-6 text-center relative">
                  <div className="relative flex h-16 w-full items-center justify-center mb-3">
                    <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-xl transition group-hover:bg-cyan-400/20" />
                    <Image
                      src={partner.logo}
                      alt={partner.alt}
                      width={180}
                      height={80}
                      priority
                      className="relative z-10 h-12 w-auto object-contain"
                    />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{partner.name}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {partner.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop view: Continuous sliding partners */}
        <div className="hidden md:block overflow-hidden py-4">
          <div className="animate-infinite-partner-scroll">
            {[...partners, ...partners, ...partners].map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className="flex-shrink-0 w-64 mx-3 group relative overflow-hidden rounded-3xl border border-cyan-500/10 bg-white/[0.03] backdrop-blur-md"
              >
                <div className="absolute top-0 left-0 h-px w-2/3 bg-gradient-to-r from-cyan-400/50 to-transparent" />
                <div className="flex flex-col items-center px-6 py-8 text-center relative">
                  <div className="relative flex h-20 w-full items-center justify-center mb-4">
                    <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-xl transition group-hover:bg-cyan-400/20" />
                    <Image
                      src={partner.logo}
                      alt={partner.alt}
                      width={220}
                      height={96}
                      priority
                      className="relative z-10 h-16 w-auto object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{partner.name}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {partner.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Add the CSS animation for infinite partner scrolling
const PartnerScrollStyle = () => (
  <style jsx global>{`
    @keyframes infinite-partner-scroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-100%);
      }
    }
    
    .animate-infinite-partner-scroll {
      display: flex;
      animation: infinite-partner-scroll 40s linear infinite;
    }
    
    .animate-infinite-partner-scroll:hover {
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

export { AnimatedPartnersSection, PartnerScrollStyle };