"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Users, Globe, Award, BookOpen } from "lucide-react"

const FloatingParticle = ({ delay }: { delay: number }) => {
  const y = useMotionValue(0)
  const ySpring = useSpring(y, { stiffness: 100, damping: 10 })

  useEffect(() => {
    const moveParticle = () => {
      y.set(Math.random() * -100)
      setTimeout(moveParticle, Math.random() * 5000 + 3000)
    }
    setTimeout(moveParticle, delay)
  }, [y, delay])

  return (
    <motion.div
      className="absolute h-1 w-1 rounded-full bg-orange-400"
      style={{
        x: `${Math.random() * 100}%`,
        y: ySpring,
        opacity: 0.7,
      }}
    />
  )
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

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
    <section
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-linear-to-b from-slate-100 via-white to-slate-100 text-slate-900 dark:from-black dark:via-black dark:to-black dark:text-white transition-colors duration-300"
    >
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, index) => (
          <FloatingParticle key={index} delay={index * 100} />
        ))}
      </div>

      <motion.div style={{ y, opacity }} className="relative px-4 pt-16 pb-16">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h1 className="relative mb-6 text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-orange-500 to-orange-400 dark:from-white dark:via-orange-200 dark:to-orange-400 md:text-8xl">
              Celebrating Africa&apos;s Future Leaders
              <motion.span
                className="absolute -inset-1 rounded-full bg-orange-400/60 blur-3xl dark:bg-orange-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
              />
            </h1>
            <p className="mx-auto mb-8 max-w-4xl text-balance text-xl text-slate-600 dark:text-zinc-300 md:text-2xl">
              Top100 Africa Future Leaders 2025 spotlighted young leaders turning ideas into impact across 13+ African
              countries.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative z-10">
                <Button
                  size="lg"
                  className="group relative overflow-hidden rounded-full bg-orange-500 px-8 py-6 text-lg text-white transition-colors hover:bg-orange-600"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onClick={() => scrollToSection("awardees")}
                >
                  <span className="relative z-10">Meet the Awardees</span>
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
                className="rounded-full border border-orange-400 px-8 py-6 text-lg text-orange-500 hover:bg-orange-500 hover:text-black"
                onClick={() => scrollToSection("magazine")}
              >
                Download 2024 Magazine
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="grid gap-4 rounded-3xl border border-orange-400/20 bg-white/70 p-6 backdrop-blur dark:bg-black/30 md:grid-cols-4"
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
