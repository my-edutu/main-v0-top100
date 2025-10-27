"use client"

import { motion } from "framer-motion"
import { Globe, Users, Award } from "lucide-react"

const impactStats = [
  {
    icon: Globe,
    label: "Countries",
    value: "31+",
    description: "Across the world",
  },
  {
    icon: Users,
    label: "Lives impacted",
    value: "97,000",
    description: "Stories of students inspiring communities",
  },
  {
    icon: Award,
    label: "Awardees",
    value: "400+",
    description: "Future leaders recognized since launch",
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

        <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {impactStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                whileTap={{ y: -1 }}
                transition={{ type: "spring", stiffness: 220, damping: 24, delay: index * 0.05 }}
                viewport={{ once: true, amount: 0.3 }}
                className="group relative flex min-w-0 flex-col gap-3 rounded-2xl border border-border/50 bg-background/85 px-4 py-5 text-left shadow-sm ring-1 ring-transparent backdrop-blur-sm transition-all sm:px-5 sm:py-6 md:hover:shadow-lg md:hover:ring-primary/20"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
                      {stat.value}
                    </div>
                    <div className="text-[0.55rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground sm:text-[0.65rem]">
                      {stat.label}
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{stat.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
