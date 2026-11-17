"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Image from "@/components/safe-image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function MagazineSection() {
  return (
    <section id="magazine" className="relative scroll-mt-24 overflow-hidden py-8 sm:py-12 lg:py-20">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-5 min-[400px]:flex-row sm:gap-8 lg:gap-20">
            {/* Image Side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="flex w-40 shrink-0 justify-start min-[400px]:w-[34%] sm:w-[33%] lg:w-[35%]"
            >
              <div className="relative group w-full max-w-[320px]">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-orange-100/50 bg-white lg:rounded-[24px]">
                  <Image
                    src="/magazine-cover-2025.jpg"
                    alt="Africa Future Leaders Magazine 2025 Cover"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 399px) 160px, (max-width: 639px) 34vw, (max-width: 1023px) 33vw, 320px"
                  />
                  {/* Subtle glare effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>

            {/* Content Side */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="min-w-0 flex-1 space-y-4 text-center min-[400px]:text-left sm:space-y-5 lg:space-y-8"
            >
              <div className="space-y-2 sm:space-y-3 lg:space-y-6">
                <h2 className="text-[clamp(1.625rem,4.8vw,2.75rem)] font-bold leading-tight tracking-tight text-zinc-900 lg:text-6xl">
                  Africa Future <span className="text-orange-600">Leaders</span> Magazine
                </h2>
                <p className="max-w-2xl text-base leading-relaxed text-zinc-600 lg:text-xl">
                  Read the stories of young African leaders and see what they&apos;re building.
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 min-[400px]:items-start sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:pt-4">
                <Button
                  size="lg"
                  className="h-11 gap-2 rounded-xl bg-orange-600 px-3 text-sm font-semibold text-white transition-all hover:bg-orange-700 active:scale-95 sm:px-5 lg:h-14 lg:rounded-2xl lg:px-10 lg:text-lg"
                  asChild
                >
                  <Link href="/magazine">
                    Get free digital copy
                    <ArrowRight className="size-4 lg:size-5" aria-hidden="true" />
                  </Link>
                </Button>
                <p className="text-sm text-zinc-600">Available in PDF and print</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
