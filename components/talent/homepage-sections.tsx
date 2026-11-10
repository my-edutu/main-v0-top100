'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Search } from 'lucide-react'
import Image from '@/components/safe-image'

export function TalentDiscoveryHomeSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section aria-labelledby="home-talent-title" className="scroll-mt-24">
      <div className="relative isolate overflow-hidden bg-[#17120f] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-0"
            whileInView={reduceMotion === false ? { scale: [1, 1.08], x: [0, -6] } : undefined}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 4, ease: 'easeOut' }}
          >
            <Image
              src="/IMG_0684.jpg"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-[center_40%] sm:object-[center_35%]"
            />
          </motion.div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#17120f18_0%,#17120fa3_35%,#17120fec_100%)] md:bg-[linear-gradient(90deg,#17120ff0_0%,#17120fd9_38%,#17120f45_100%)]" />
        </div>

        <div className="container relative pb-10 pt-36 sm:pb-14 sm:pt-40 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">Impact Beyond Recognition</p>
          <h2 id="home-talent-title" className="mt-4 max-w-xl scroll-mt-[18rem] text-3xl font-semibold leading-tight tracking-tight text-[#fff] sm:scroll-mt-44 sm:text-4xl lg:text-5xl">
            Recognition opens a door.<br />
            <span className="text-orange-200">Opportunity is what comes next.</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-stone-100">
            Meet young African leaders, see what they’ve built, and find people whose skills fit your team.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/awardees" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-orange-300 px-5 py-2.5 text-sm font-bold text-stone-950 hover:bg-orange-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200">
              Discover talent <Search size={17} aria-hidden="true" />
            </Link>
            <Link
              href="/for-organisations"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/65 bg-stone-950/70 px-4 py-2.5 text-sm font-semibold text-[#fff] hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200"
            >
              Work with our network <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
