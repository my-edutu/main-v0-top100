"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { Users, Globe } from "lucide-react"

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
  const ref = useRef<HTMLHeadingElement | null>(null)

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
          if (typeof document !== 'undefined') {
            void document.body.offsetHeight;
          }
          setAnimationClass('animate-hero-highlight')
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the element is visible
    )

    const headingNode = ref.current

    if (headingNode) {
      observer.observe(headingNode)
    }

    return () => {
      if (headingNode) {
        observer.unobserve(headingNode)
      }
      clearTimeout(timer)
    }
  }, [])

  return (
    <section className="relative flex min-h-[620px] items-center justify-center overflow-hidden bg-white text-slate-900 transition-colors duration-300 sm:min-h-[680px] md:min-h-[720px] lg:min-h-[760px] xl:min-h-[720px] dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Floating particles - only render on client to avoid hydration mismatch */}
        {isMounted && [...Array(30)].map((_, index) => (
          <FloatingParticle key={index} delay={index * 150} />
        ))}
      </div>

      <div className="relative z-10 w-full px-4 pb-36 pt-20 sm:px-6 sm:pb-40 sm:pt-24 md:px-8 lg:pb-44 lg:pt-28">
        <div className="mx-auto max-w-6xl md:max-w-7xl">
          <div className="mx-auto max-w-5xl space-y-7 text-center">
            <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
              <p className="mx-auto w-fit rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase text-orange-700 shadow-sm backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white/80">
                2026 applications open
              </p>

              <div className="relative overflow-hidden">
                <h1
                  ref={ref}
                  className="text-balance text-4xl font-semibold leading-[0.98] text-slate-950 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white"
                >
                  <span className="relative z-10">
                    Apply for Africa Future Leaders 2026
                  </span>
                </h1>
                <span className={`absolute top-0 left-0 w-full h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 hero-highlight ${animationClass}`}></span>
              </div>

              <p className="mx-auto max-w-3xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8 md:text-xl dark:text-slate-200">
                For first-class graduates creating measurable impact across Africa. Join a continent-wide network of leaders,
                mentors, and opportunities across 31 countries.
              </p>
            </div>
            
            <div className="mx-auto flex w-full max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-full sm:w-[230px] md:w-[260px]"
              >
                <Link
                  href="/apply"
                  className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-r from-orange-500 to-yellow-500 px-5 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-yellow-600 sm:h-14 sm:text-base"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Apply now</span>
                  </span>
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600"
                    initial={{ x: "-100%" }}
                    animate={{ x: isHovered ? "100%" : "-100%" }}
                    transition={{ duration: 0.5 }}
                  />
                </Link>
              </motion.div>

              <Link
                href="/apply/partnership"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-primary px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:h-14 sm:w-[230px] sm:text-base md:w-[260px]"
              >
                <Globe className="h-4 w-4" />
                <span>Partner with us</span>
              </Link>
            </div>

          </div>
        </div>
      </div>

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
                    <Image
                      src={`https://flagcdn.com/w40/${country.code}.png`}
                      alt={`${country.name} flag`}
                      width={40}
                      height={25}
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
                    <Image
                      src={`https://flagcdn.com/w40/${country.code}.png`}
                      alt={`${country.name} flag`}
                      width={40}
                      height={25}
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
