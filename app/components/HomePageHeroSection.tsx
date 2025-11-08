"use client"

// Force rebuild to fix module loading issue
import { useEffect, useMemo, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { Button } from "@/components/ui/button"
import { GraduationCap, Users, Globe } from "lucide-react"

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
      className="absolute h-1 w-1 rounded-full bg-orange-400 opacity-40"
      style={{
        x: `${xPosition}%`,
        y: ySpring,
        opacity: 0.7,
      }}
    />
  )
}

function HomePageHeroSection() {
  const [isHovered, setIsHovered] = useState(false)

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Floating particles */}
        {[...Array(30)].map((_, index) => (
          <FloatingParticle key={index} delay={index * 150} />
        ))}
      </div>

      <motion.div 
        className="relative px-4 py-16 sm:px-6 md:px-8 z-10 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="mx-auto max-w-6xl md:max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-12 space-y-8 text-center md:mb-16"
          >
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                <Globe className="h-4 w-4" />
                <span>13+ African Countries</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-slate-900">
                <span className="block">Celebrating Africa&apos;s</span>
                <span className="block mt-2 text-slate-900">
                  Future Leaders
                </span>
              </h1>
              
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-900 md:text-xl">
                Top100 Africa Future Leaders identifies, celebrates, and empowers Africa's brightest young leaders across diverse fields and countries.
              </p>
            </div>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                className="relative"
              >
                <Button
                  size="lg"
                  className="group relative overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-4 text-base sm:px-8 sm:py-6 sm:text-lg text-white transition-all hover:from-orange-600 hover:to-yellow-600"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onClick={() => scrollToSection("awardees")}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Meet the Awardees</span>
                  </span>
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600"
                    initial={{ x: "-100%" }}
                    animate={{ x: isHovered ? "100%" : "-100%" }}
                    transition={{ duration: 0.5 }}
                  />
                </Button>
              </motion.div>
              
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border border-primary px-6 py-4 text-base sm:px-8 sm:py-6 sm:text-lg text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => scrollToSection("magazine")}
              >
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">View 2025 Magazine</span>
                </span>
              </Button>
            </div>

          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

export default HomePageHeroSection

// Fixed export issue