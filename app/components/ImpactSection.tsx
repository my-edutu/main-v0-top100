"use client"

import { motion } from "framer-motion"
import { Globe, Users, Award, Handshake } from "lucide-react"

const impactStats = [
  {
    icon: Globe,
    label: "Countries",
    value: "31+",
    description: "Across the African continent",
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
      <div className="container space-y-6">
        <div className="text-center">

          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">The movement in numbers</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Celebrating achievements and creating opportunities across Africa&apos;s campuses, communities, and capitals.
          </p>
        </div>

        <div className="flex gap-3">
          {impactStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
                viewport={{ once: true, amount: 0.3 }}
                className="flex-1 min-w-[150px] rounded-xl border border-border/70 bg-card/95 p-4 shadow-sm shadow-primary/5 flex flex-col"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-4 text-xl font-semibold text-foreground">{stat.value}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {stat.label}
                </div>
                <p className="mt-2 text-xs text-muted-foreground mt-auto">{stat.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}