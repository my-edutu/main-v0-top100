"use client"

import { useEffect, useState, type ComponentType, type SVGProps } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { MapPinned, Medal, Target } from "lucide-react"
import Counter from "@/components/Counter"

type ImpactStat = {
  key: "countries" | "goal" | "awardees"
  label: string
  description: string
  value: number
  suffix: string
}

type ImpactStatVisual = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  gradient: string
  accent: string
}

const impactStatVisuals: Record<ImpactStat["key"], ImpactStatVisual> = {
  countries: {
    icon: MapPinned,
    gradient: "linear-gradient(145deg, rgba(255,179,71,0.95), rgba(255,131,87,0.92))",
    accent: "rgba(255,255,255,0.75)",
  },
  goal: {
    icon: Target,
    gradient: "linear-gradient(145deg, rgba(101,200,255,0.95), rgba(80,130,255,0.92))",
    accent: "rgba(255,255,255,0.8)",
  },
  awardees: {
    icon: Medal,
    gradient: "linear-gradient(145deg, rgba(238,186,255,0.95), rgba(255,144,214,0.92))",
    accent: "rgba(255,255,255,0.8)",
  },
}

type ImpactMetricCardProps = {
  stat: ImpactStat
  index: number
  animated: boolean
}

const metricCardClassName =
  "group relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-xl border border-white/25 bg-card p-8 text-center shadow-lg shadow-black/10 transition-all min-h-32 sm:min-h-44"

export function ImpactMetricCard({ stat, index, animated }: ImpactMetricCardProps) {
  const visual = impactStatVisuals[stat.key]
  const Icon = visual.icon
  const content = (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[28px] bg-white/15 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center">
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-white/15 text-slate-900 shadow-inner"
            style={{
              borderColor: visual.accent,
              boxShadow: `0 18px 38px -12px ${visual.accent}`,
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-4xl font-bold tracking-tight text-slate-900 ml-2">
            <Counter target={stat.value} duration={2000} className="text-black" />
            {stat.suffix}
          </div>
        </div>
        <div className="text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-900 leading-[1.3] font-sans">
            {stat.label}
          </p>
          <p className="text-sm leading-[1.3] text-slate-900 font-sans">
            {stat.description}
          </p>
        </div>
      </div>
    </>
  )
  const style = { backgroundImage: visual.gradient }

  if (!animated) {
    return (
      <article key="static" className={metricCardClassName} style={style}>
        {content}
      </article>
    )
  }

  return (
    <motion.article
      key="animated"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: index * 0.05 }}
      viewport={{ once: true, amount: 0.3 }}
      className={metricCardClassName}
      style={style}
    >
      {content}
    </motion.article>
  )
}

export default function ImpactSection() {
  const [canAnimate, setCanAnimate] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    setCanAnimate(reduceMotion === false)
  }, [reduceMotion])

  const impactStats: ImpactStat[] = [
    { key: "countries", label: "Countries", description: "Across Africa", value: 100, suffix: "+" },
    { key: "goal", label: "2030 goal", description: "Youth leaders across Africa", value: 10_000, suffix: "" },
    { key: "awardees", label: "Awardees", description: "Exceptional young Africans", value: 1_800, suffix: "+" },
  ]

  return (
    <section className="section-padding">
      <div className="container space-y-10">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-tight font-sans">
            Our reach and ambition
          </h2>
          <p className="mx-auto text-sm leading-relaxed text-muted-foreground sm:text-base font-sans tracking-wide">
            Celebrating exceptional young Africans and building opportunity across the continent.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {impactStats.map((stat, index) => (
            <ImpactMetricCard
              key={stat.label}
              stat={stat}
              index={index}
              animated={canAnimate}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
