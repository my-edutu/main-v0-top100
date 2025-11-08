"use client";

import Image from "next/image";

const AnimatedPartnersSection = () => {
  const partners = [
    {
      name: "One Young World West & Central Africa",
      logo: "/3.png",
      alt: "One Young World West and Central Africa logo",
      description:
        "Partners with youth-led initiatives accelerating leadership, innovation, and social impact across the continent.",
    },
    {
      name: "ALX Nigeria",
      logo: "/7.png",
      alt: "ALX Nigeria logo",
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
    <section className="relative overflow-hidden py-6 bg-zinc-900">
      <div className="container relative mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Meet some of our sponsors
          </h2>
        </div>

        {/* Mobile view: Scrollable partners */}
        <div className="md:hidden overflow-x-auto py-3 px-2 -mx-2 scrollbar-hide">
          <div className="flex space-x-4 min-w-max">
            {partners.map((partner, index) => (
              <div
                key={`mobile-${partner.name}-${index}`}
                className="flex-shrink-0 w-40 group relative overflow-hidden rounded-2xl border border-cyan-500/10 bg-white/[0.03] backdrop-blur-md"
              >
                <div className="flex flex-col items-center px-2 py-4 text-center relative">
                  <div className="relative flex h-20 w-full items-center justify-center mb-1">
                    <Image
                      src={partner.logo}
                      alt={partner.alt}
                      width={180}
                      height={80}
                      priority
                      className="relative z-10 h-16 w-auto object-contain"
                    />
                  </div>
                  <h3 className="text-xs font-semibold text-white">{partner.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop view: Continuous sliding partners */}
        <div className="hidden md:block overflow-hidden py-3">
          <div className="animate-infinite-partner-scroll">
            {[...partners, ...partners, ...partners].map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className="flex-shrink-0 w-48 mx-2 group relative overflow-hidden rounded-2xl border border-cyan-500/10 bg-white/[0.03] backdrop-blur-md"
              >
                <div className="flex flex-col items-center px-3 py-5 text-center relative">
                  <div className="relative flex h-24 w-full items-center justify-center mb-2">
                    <Image
                      src={partner.logo}
                      alt={partner.alt}
                      width={220}
                      height={96}
                      priority
                      className="relative z-10 h-20 w-auto object-contain"
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{partner.name}</h3>
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