"use client"

import type { ComponentType, SVGProps } from "react"
import { motion } from "framer-motion"
import { Globe, Users, Award } from "lucide-react"

type ImpactStat = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
  description: string
  gradient: string
  accent: string
}

const impactStats: ImpactStat[] = [
  {
    icon: Globe,
    label: "Countries",
    value: "31+",
    description: "Across the world",
    gradient: "linear-gradient(145deg, rgba(255,179,71,0.95), rgba(255,131,87,0.92))",
    accent: "rgba(255,255,255,0.75)",
  },
  {
    icon: Users,
    label: "Lives impacted",
    value: "97,000",
    description: "Stories of students inspiring communities",
    gradient: "linear-gradient(145deg, rgba(101,200,255,0.95), rgba(80,130,255,0.92))",
    accent: "rgba(255,255,255,0.8)",
  },
  {
    icon: Award,
    label: "Awardees",
    value: "400+",
    description: "Future leaders recognized since launch",
    gradient: "linear-gradient(145deg, rgba(238,186,255,0.95), rgba(255,144,214,0.92))",
    accent: "rgba(255,255,255,0.8)",
  },
]

export default function ImpactSection() {
  return (
    <section>
      <div className="container space-y-10">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-tight">
            The movement in numbers
          </h2>
          <p className="mx-auto text-sm leading-relaxed text-muted-foreground sm:text-base">
            Celebrating achievements and creating opportunities across Africa&apos;s campuses, communities, and capitals.
          </p>
        </div>

        <div className="relative -mx-4">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:pb-6 lg:gap-6">
            {impactStats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.article
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -10 }}
                  whileTap={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 220, damping: 24, delay: index * 0.05 }}
                  viewport={{ once: true, amount: 0.3 }}
                  className="group relative flex min-w-[260px] snap-center flex-shrink-0 flex-col items-center gap-6 overflow-hidden rounded-[28px] border border-white/25 px-6 py-8 text-center shadow-lg shadow-black/10 ring-1 ring-transparent transition-all sm:min-w-[280px] sm:px-8 sm:py-9 lg:min-w-[320px] lg:gap-7 lg:px-10 lg:py-10"
                  style={{ backgroundImage: stat.gradient }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[28px] bg-white/15 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div
                    className="relative flex h-12 w-12 items-center justify-center rounded-full border bg-white/15 text-white shadow-inner"
                    style={{
                      borderColor: stat.accent,
                      boxShadow: `0 18px 38px -12px ${stat.accent}`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-3 text-center">
                    <div className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
                      {stat.value}
                    </div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-white/85 sm:text-xs">
                      {stat.label}
                    </p>
                    <p className="text-sm leading-relaxed text-white/85 sm:text-base">
                      {stat.description}
                    </p>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
