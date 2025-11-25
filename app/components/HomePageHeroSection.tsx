"use client"

// Force rebuild to fix module loading issue
import { useEffect, useMemo, useState, useRef } from "react"
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
  const [isMounted, setIsMounted] = useState(false)
  const [animationClass, setAnimationClass] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    setIsMounted(true)

    // Trigger animation on initial load
    const timer = setTimeout(() => {
      setAnimationClass('animate-hero-highlight')
    }, 300) // Slight delay to ensure the element is mounted

    // Set up Intersection Observer to detect when the section comes into view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add animation class when hero comes into view
          setAnimationClass('')
          // Trigger reflow to restart animation
          void document.body.offsetHeight;
          setAnimationClass('animate-hero-highlight')
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the element is visible
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
      clearTimeout(timer)
    }
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Floating particles - only render on client to avoid hydration mismatch */}
        {isMounted && [...Array(30)].map((_, index) => (
          <FloatingParticle key={index} delay={index * 150} />
        ))}
      </div>

      <motion.div
        className="relative px-4 py-12 sm:py-16 sm:px-6 md:px-8 z-10 w-full"
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
              <div className="relative overflow-hidden">
                <h1
                  ref={ref}
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight text-slate-900"
                >
                  <span className="block relative z-10">
                    Celebrating Africa&apos;s
                  </span>
                  <span className="block mt-1 sm:mt-2 text-slate-900 relative z-10">
                    Future Leaders
                  </span>
                </h1>
                <span className={`absolute top-0 left-0 w-full h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 hero-highlight ${animationClass}`}></span>
              </div>

              <p className="mx-auto mt-4 max-w-3xl text-lg sm:text-xl md:text-2xl leading-relaxed text-slate-900">
                Top100 Africa Future Leaders identifies, celebrates, and empowers Africa's brightest young leaders across diverse fields and countries.
              </p>
            </div>
            
            <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-full sm:w-auto"
              >
                <Button
                  size="sm"
                  className="group relative overflow-hidden rounded-[10px] bg-gradient-to-r from-orange-500 to-yellow-500 px-4 py-4 text-sm sm:px-16 sm:py-[18px] sm:text-base text-white transition-all hover:from-orange-600 hover:to-yellow-600 w-full sm:w-auto h-12"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onClick={() => scrollToSection("awardees")}
                >
                  <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                    <Users className="h-4 w-4 sm:h-4 sm:w-4" />
                    <span className="text-sm sm:text-lg">Meet the Awardees</span>
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
                size="sm"
                className="rounded-[10px] border border-primary px-4 py-4 text-sm sm:px-16 sm:py-[18px] sm:text-base text-primary hover:bg-primary hover:text-primary-foreground w-full sm:w-auto h-12"
                onClick={() => scrollToSection("magazine")}
              >
                <span className="flex items-center gap-1 sm:gap-2">
                  <GraduationCap className="h-4 w-4 sm:h-4 sm:w-4" />
                  <span className="text-sm sm:text-lg">View 2025 Magazine</span>
                </span>
              </Button>
            </div>

          </motion.div>
        </div>
      </motion.div>

      {/* Animated Flag Slider */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm w-full">
          <div className="text-center py-3">
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">impact across 31 countries worldwide</p>
          </div>
          <div className="relative overflow-hidden w-full pt-2">
            <div
              className="flex whitespace-nowrap"
              style={{
                animation: 'slide 40s linear infinite',
              }}
            >
              {[
                { name: 'Nigeria', code: 'ng' },
                { name: 'United Kingdom', code: 'gb' },
                { name: 'Kenya', code: 'ke' },
                { name: 'Canada', code: 'ca' },
                { name: 'Tanzania', code: 'tz' },
                { name: 'South Africa', code: 'za' },
                { name: 'Cameroon', code: 'cm' },
                { name: 'Netherlands', code: 'nl' },
                { name: 'Ethiopia', code: 'et' },
                { name: 'Namibia', code: 'na' },
                { name: 'Burkina Faso', code: 'bf' },
                { name: 'India', code: 'in' },
                { name: 'China', code: 'cn' },
                { name: 'Thailand', code: 'th' },
                { name: 'United States', code: 'us' },
                { name: 'Zimbabwe', code: 'zw' },
                { name: 'Portugal', code: 'pt' },
                { name: 'North Macedonia', code: 'mk' },
                { name: 'France', code: 'fr' },
                { name: 'Spain', code: 'es' },
                { name: 'Pakistan', code: 'pk' },
                { name: 'Zambia', code: 'zm' },
                { name: 'Mozambique', code: 'mz' },
                { name: 'Egypt', code: 'eg' },
                { name: 'Armenia', code: 'am' },
                { name: 'Liberia', code: 'lr' },
                { name: 'Sudan', code: 'sd' },
                { name: 'Argentina', code: 'ar' },
                { name: 'Côte d\'Ivoire', code: 'ci' },
                { name: 'Democratic Republic of the Congo', code: 'cd' },
                { name: 'Morocco', code: 'ma' },
              ].map((country, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center mx-6 flex-shrink-0"
                >
                  <div className="w-8 h-5 mb-1 rounded-sm overflow-hidden border border-gray-200">
                    <img
                      src={`https://flagcdn.com/w40/${country.code}.png`}
                      alt={`${country.name} flag`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[0.6rem] leading-tight text-slate-700 dark:text-slate-300 text-center max-w-[60px] truncate">
                    {country.name}
                  </span>
                </div>
              ))}
              {[
                { name: 'Nigeria', code: 'ng' },
                { name: 'United Kingdom', code: 'gb' },
                { name: 'Kenya', code: 'ke' },
                { name: 'Canada', code: 'ca' },
                { name: 'Tanzania', code: 'tz' },
                { name: 'South Africa', code: 'za' },
                { name: 'Cameroon', code: 'cm' },
                { name: 'Netherlands', code: 'nl' },
                { name: 'Ethiopia', code: 'et' },
                { name: 'Namibia', code: 'na' },
                { name: 'Burkina Faso', code: 'bf' },
                { name: 'India', code: 'in' },
                { name: 'China', code: 'cn' },
                { name: 'Thailand', code: 'th' },
                { name: 'United States', code: 'us' },
                { name: 'Zimbabwe', code: 'zw' },
                { name: 'Portugal', code: 'pt' },
                { name: 'North Macedonia', code: 'mk' },
                { name: 'France', code: 'fr' },
                { name: 'Spain', code: 'es' },
                { name: 'Pakistan', code: 'pk' },
                { name: 'Zambia', code: 'zm' },
                { name: 'Mozambique', code: 'mz' },
                { name: 'Egypt', code: 'eg' },
                { name: 'Armenia', code: 'am' },
                { name: 'Liberia', code: 'lr' },
                { name: 'Sudan', code: 'sd' },
                { name: 'Argentina', code: 'ar' },
                { name: 'Côte d\'Ivoire', code: 'ci' },
                { name: 'Democratic Republic of the Congo', code: 'cd' },
                { name: 'Morocco', code: 'ma' },
              ].map((country, index) => (
                <div
                  key={`duplicate-${index}`}
                  className="flex flex-col items-center justify-center mx-6 flex-shrink-0"
                >
                  <div className="w-8 h-5 mb-1 rounded-sm overflow-hidden border border-gray-200">
                    <img
                      src={`https://flagcdn.com/w40/${country.code}.png`}
                      alt={`${country.name} flag`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[0.6rem] leading-tight text-slate-700 dark:text-slate-300 text-center max-w-[60px] truncate">
                    {country.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </section>
  )
}

export default HomePageHeroSection

// Fixed export issue