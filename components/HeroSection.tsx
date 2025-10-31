"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Users, Globe, Award, BookOpen } from "lucide-react"

type FloatingParticleProps = {
  delay: number
}

const FloatingParticle = ({ delay }: FloatingParticleProps) => {
  const y = useMotionValue(0)
  const ySpring = useSpring(y, { stiffness: 100, damping: 10 })
  const xPosition = useMemo(() => Math.random() * 100, [])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const moveParticle = () => {
      y.set(Math.random() * -100)
      timeoutId = setTimeout(moveParticle, Math.random() * 5000 + 3000)
    }

    timeoutId = setTimeout(moveParticle, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [delay, y])

  return (
    <motion.div
      className="absolute h-1 w-1 rounded-full bg-orange-400"
      style={{
        x: `${xPosition}%`,
        y: ySpring,
        opacity: 0.7,
      }}
    />
  )
}

export default function HeroSection() {
  const [isHovered, setIsHovered] = useState(false)

  const stats = [
    { icon: <Globe className="h-6 w-6" />, label: "Countries", value: "20+" },
    { icon: <Users className="h-6 w-6" />, label: "Applications", value: "5,000+" },
    { icon: <Award className="h-6 w-6" />, label: "Awardees", value: "100" },
    { icon: <BookOpen className="h-6 w-6" />, label: "Scholarships", value: "150+" },
  ]

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-linear-to-b from-slate-100 via-white to-slate-100 text-slate-900 transition-colors duration-300 dark:from-black dark:via-black dark:to-black dark:text-white">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, index) => (
          <FloatingParticle key={index} delay={index * 100} />
        ))}
      </div>

      <motion.div className="relative px-4 py-16 sm:px-6 md:px-8 md:py-24 xl:py-28">
        <div className="mx-auto max-w-6xl md:max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12 space-y-6 text-center md:mb-16"
          >
            <h1 className="relative mx-auto max-w-4xl bg-gradient-to-r from-slate-900 via-orange-500 to-orange-400 text-5xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-200 dark:to-orange-400 sm:text-6xl md:text-7xl md:leading-tight lg:text-8xl">
              Africa Future Leaders
              <motion.span
                className="absolute -inset-1 rounded-full bg-orange-400/60 blur-3xl dark:bg-orange-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
              />
            </h1>
            <p className="mx-auto max-w-3xl text-balance text-lg leading-relaxed text-slate-600 dark:text-zinc-300 md:max-w-4xl md:text-xl">
              Join us in discovering, celebrating, and empowering the bright minds shaping Africa&apos;s future.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative z-10">
                <Button
                  size="lg"
                  className="group relative overflow-hidden rounded-full bg-yellow-500 px-8 py-6 text-lg text-white transition-colors hover:bg-yellow-600"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onClick={() => scrollToSection("awardees")}
                >
                  <span className="relative z-10">Explore Leadership</span>
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500"
                    initial={{ x: "100%" }}
                    animate={{ x: isHovered ? "0%" : "100%" }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.span
                    animate={{ x: isHovered ? 5 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative z-10 ml-2"
                  >
                    {"\u2192"}
                  </motion.span>
                </Button>
              </motion.div>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border border-yellow-400 px-8 py-6 text-lg text-yellow-500 hover:bg-yellow-500 hover:text-black"
                onClick={() => scrollToSection("about")}
              >
                Learn More
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="grid gap-4 rounded-3xl border border-orange-400/20 bg-white/70 p-6 backdrop-blur dark:bg-black/30 sm:gap-6 sm:p-8 md:grid-cols-4"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-black/40"
              >
                <div className="rounded-full bg-orange-500/10 p-3 text-orange-300">{stat.icon}</div>
                <div className="text-2xl font-semibold text-slate-900 dark:text-white">{stat.value}</div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-zinc-400">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
