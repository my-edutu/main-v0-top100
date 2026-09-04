"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"

import TypeEffect from "@/components/TypeEffect"

export default function RotatingVisionSection({ images }: { images: readonly string[] }) {
  const [active, setActive] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion || images.length < 2) return

    let timer: ReturnType<typeof setInterval> | undefined
    const sync = () => {
      if (document.hidden) {
        if (timer) clearInterval(timer)
        timer = undefined
      } else if (!timer) {
        timer = setInterval(() => setActive((index) => (index + 1) % images.length), 6000)
      }
    }

    sync()
    document.addEventListener("visibilitychange", sync)
    return () => {
      document.removeEventListener("visibilitychange", sync)
      if (timer) clearInterval(timer)
    }
  }, [images.length, reduceMotion])

  return (
    <section className="relative isolate min-h-[430px] overflow-hidden bg-[#0b1220] py-16 sm:min-h-[520px] sm:py-20">
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="100vw"
          className={`object-cover transition-opacity duration-1000 ${index === active ? "opacity-100" : "opacity-0"}`}
          aria-hidden={index !== active}
        />
      ))}
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(0,0,0,0.52)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.65)] via-transparent to-[rgba(0,0,0,0.2)]" />

      <div className="container relative z-10 flex min-h-[302px] items-center justify-center sm:min-h-[360px]">
        <div className="flex flex-col items-center justify-center text-center text-white">
          <div className="mb-4 flex items-center gap-3 sm:gap-4">
            <div className="text-5xl font-extrabold drop-shadow-2xl sm:text-7xl md:text-8xl lg:text-9xl" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
              10,000
            </div>
            <div className="flex flex-col items-start justify-center">
              <div className="text-lg font-bold uppercase leading-tight drop-shadow-lg sm:text-xl md:text-2xl"><TypeEffect text="youth" speed={150} /></div>
              <div className="text-lg font-bold uppercase leading-tight drop-shadow-lg sm:text-xl md:text-2xl"><TypeEffect text="leaders" speed={200} /></div>
            </div>
          </div>
          <p className="mt-4 max-w-4xl text-xl font-bold drop-shadow-xl sm:text-2xl md:text-3xl lg:text-4xl">
            Our vision is to identify, empower, and celebrate youth leaders across Africa by 2030.
          </p>
          <div className="mt-6 h-1 w-24 rounded-full bg-white/70 shadow-lg" />
        </div>
      </div>
    </section>
  )
}
