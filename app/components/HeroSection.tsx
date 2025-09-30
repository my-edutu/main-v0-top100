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
      className="absolute w-1 h-1 bg-orange-400 rounded-full"
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
    { icon: <Globe className="w-6 h-6" />, label: "Countries", value: "20+" },
    { icon: <Users className="w-6 h-6" />, label: "Applications", value: "5,000+" },
    { icon: <Award className="w-6 h-6" />, label: "Awardees", value: "100" },
    { icon: <BookOpen className="w-6 h-6" />, label: "Scholarships", value: "150+" },
  ]

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section ref={containerRef} className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 100} />
        ))}
      </div>

      <motion.div style={{ y, opacity }} className="relative pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight relative">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-orange-200 to-orange-400">
                Celebrating Africa's Future Leaders
              </span>
              <motion.span
                className="absolute -inset-1 bg-orange-400 rounded-full blur-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
              />
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-zinc-300 max-w-4xl mx-auto text-balance">
              Top100 Africa Future Leaders 2025 spotlighted Young Leaders turning ideas into impact across 13+ Africa Countries.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative z-10">
                <Button
                  size="lg"
                  className="bg-orange-500 text-white hover:bg-orange-600 text-lg px-8 py-6 rounded-full transition-colors relative overflow-hidden group"
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
                    className="ml-2 relative z-10"
                  >
                    →
                  </motion.span>
                </Button>
              </motion.div>
              <Button
                variant="outline"
                size="lg"
                className="border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-black text-lg px-8 py-6 rounded-full bg-transparent"
                onClick={() => scrollToSection("magazine")}
              >
                Download 2024 Magazine
              </Button>
            </div>
          </motion.div>

          
        </div>
      </motion.div>
    </section>
  )
}
