"use client"
import Image from "next/image"

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
]

export default function MeetPartnersSection() {
  return (
    <section className="relative overflow-hidden py-24 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-500/25 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-cyan-500/10 to-transparent" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="text-center mb-20">
          <span className="inline-flex items-center px-5 py-1.5 rounded-full border border-cyan-300/40 text-cyan-200 text-xs md:text-sm tracking-[0.3em] uppercase">
            Partners
          </span>
          <h2 className="mt-6 text-4xl md:text-5xl font-bold text-white">
            Building Africa's future with visionary allies
          </h2>
          <p className="mt-5 text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto">
            These partners amplify our mission, unlocking opportunities and resources for Africa's boldest innovators.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-3">
          {partners.map((partner) => (
            <article
              key={partner.name}
              className="group relative overflow-hidden rounded-3xl border border-cyan-500/10 bg-white/[0.03] backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-cyan-400/40 hover:bg-cyan-500/10"
            >
              <div className="absolute top-0 left-0 h-px w-2/3 bg-gradient-to-r from-cyan-400/50 to-transparent" />
              <div className="flex flex-col items-center px-8 py-12 text-center relative">
                <div className="relative flex h-24 w-full items-center justify-center mb-8">
                  <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-2xl transition group-hover:bg-cyan-400/20" />
                  <Image
                    src={partner.logo}
                    alt={partner.alt}
                    width={220}
                    height={96}
                    priority
                    className="relative z-10 h-20 w-auto object-contain"
                  />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{partner.name}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed md:text-base">{partner.description}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-16 text-center text-sm text-zinc-500">
          Together we deliver learning, leadership, and entrepreneurial pathways that move African talent forward.
        </p>
      </div>
    </section>
  )
}
