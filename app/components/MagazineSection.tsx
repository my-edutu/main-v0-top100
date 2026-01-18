"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function MagazineSection() {
  return (
    <section id="magazine" className="section-padding relative">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Image Side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="w-full lg:w-[35%] flex justify-center lg:justify-start"
            >
              <div className="relative group w-full max-w-[320px]">
                <div className="relative aspect-[3/4] rounded-[24px] overflow-hidden bg-white border border-orange-100/50">
                  <Image
                    src="/magazine-cover-2025.jpg"
                    alt="Africa Future Leaders Magazine 2025 Cover"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                    sizes="(max-width: 1024px) 100vw, 320px"
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
              className="w-full lg:w-[65%] space-y-8 text-center lg:text-left"
            >
              <div className="space-y-6">
                <h2 className="text-4xl lg:text-6xl font-bold text-zinc-900 tracking-tight leading-tight">
                  Africa Future <span className="text-orange-600">Leaders</span> Magazine
                </h2>
                <p className="text-lg lg:text-xl text-zinc-600 leading-relaxed font-normal max-w-2xl mx-auto lg:mx-0">
                  Get the complete story of the Top100 Africa Future Leaders magazine and discover the journeys shaping Africa&apos;s next decade.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="h-14 px-10 rounded-2xl font-bold bg-orange-600 hover:bg-orange-700 text-white active:scale-95 transition-all w-full sm:w-auto text-lg"
                  asChild
                >
                  <Link href="/magazine">
                    Get Free Digital Copy
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <div className="flex items-center justify-center lg:justify-start gap-2 text-zinc-400 font-normal">
                  <div className="h-1 w-1 rounded-full bg-zinc-300" />
                  <span>Available in PDF & Print</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
