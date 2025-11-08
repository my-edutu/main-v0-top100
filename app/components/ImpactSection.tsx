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
    description: "Across Africa",
    gradient: "linear-gradient(145deg, rgba(255,179,71,0.95), rgba(255,131,87,0.92))",
    accent: "rgba(255,255,255,0.75)",
  },
  {
    icon: Users,
    label: "Lives impacted",
    value: "97,000",
    description: "Across Africa",
    gradient: "linear-gradient(145deg, rgba(101,200,255,0.95), rgba(80,130,255,0.92))",
    accent: "rgba(255,255,255,0.8)",
  },
  {
    icon: Award,
    label: "Awardees",
    value: "400+",
    description: "Across Africa",
    gradient: "linear-gradient(145deg, rgba(238,186,255,0.95), rgba(255,144,214,0.92))",
    accent: "rgba(255,255,255,0.8)",
  },
]

export default function ImpactSection() {
  return (
    <section className="section-padding">
      <div className="container space-y-10">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-tight">
            The movement in numbers
          </h2>
          <p className="mx-auto text-sm leading-relaxed text-muted-foreground sm:text-base">
            Celebrating achievements and creating opportunities across Africa&apos;s campuses, communities, and capitals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {impactStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.article
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 220, damping: 24, delay: index * 0.05 }}
                viewport={{ once: true, amount: 0.3 }}
                className="group relative flex flex-col items-center gap-6 overflow-hidden rounded-xl border border-white/25 bg-card p-8 text-center shadow-lg shadow-black/10 transition-all"
                style={{ backgroundImage: stat.gradient }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[28px] bg-white/15 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center">
                    <div
                      className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-white/15 text-slate-900 shadow-inner"
                      style={{
                        borderColor: stat.accent,
                        boxShadow: `0 18px 38px -12px ${stat.accent}`,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-4xl font-bold tracking-tight text-slate-900 ml-2">
                      {stat.value}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-900 leading-[1.3]">
                      {stat.label}
                    </p>
                    <p className="text-sm leading-[1.3] text-slate-900">
                      {stat.description}
                    </p>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
