"use client"

import { useMemo, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Award, GraduationCap, MapPin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AvatarSVG, flagEmoji } from "@/lib/avatars"

type SpotlightAwardee = {
  slug: string
  name: string
  country?: string | null
  bio?: string | null
  avatar_url?: string | null
  course?: string | null
  cgpa?: string | null
  featured?: boolean | null
}

type Props = {
  awardees: SpotlightAwardee[]
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

const formatExcerpt = (value?: string | null, length = 120) => {
  if (!value) return "Tap to explore their leadership journey."
  const cleaned = value.replace(/\s+/g, " ").trim()
  if (cleaned.length <= length) return cleaned
  return `${cleaned.slice(0, length)}...`
}

export default function AwardeesSpotlightClient({ awardees }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrolling, setScrolling] = useState(true);

  const safeAwardees = useMemo(
    () =>
      awardees.map((entry) => ({
        ...entry,
        slug: entry.slug && entry.slug.trim().length > 0 ? entry.slug : toSlug(entry.name),
      })),
    [awardees],
  )

  // Auto-scrolling functionality for mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  useEffect(() => {
    if (!isMobile || !scrolling || safeAwardees.length <= 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % safeAwardees.length);
    }, 3000); // Scroll every 3 seconds

    return () => clearInterval(interval);
  }, [isMobile, scrolling, safeAwardees.length]);

  // Calculate visible items for mobile auto-scrolling
  const visibleAwardees = isMobile
    ? safeAwardees.length > 0
      ? [safeAwardees[currentIndex]]
      : []
    : safeAwardees;

  return (
    <section id="awardees" className="section-padding">
      <div className="container space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.4 }}
          className="text-center"
        >
          <h2 className="mt-3 text-3xl font-semibold sm:text-[2.5rem]">
            Meet the Bold Minds Shaping Africa Tomorrow
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Discover the inspiring stories of Africa&apos;s future leaders making impact across the continent.
          </p>
        </motion.div>

        <div className="min-h-[220px] relative">
          {safeAwardees.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Spotlight awardees will appear here once they are marked as featured in Supabase.
            </div>
          ) : (
            <>
              <motion.div
                layout
                className={`flex ${isMobile ? 'overflow-hidden' : 'overflow-x-auto'} pb-4 -mx-4 px-4 gap-3 hide-scrollbar`}
              >
                {visibleAwardees.map((awardee, index) => (
                  <motion.article
                    key={isMobile ? awardee.slug : `${awardee.slug}-${index}`}
                    layout
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
                    viewport={{ once: true, amount: 0.35 }}
                    className={`flex-shrink-0 w-52 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-primary/5 transition hover:border-primary/40 hover:scale-105 hover:shadow-lg ${
                      isMobile ? 'mx-auto' : ''
                    }`}
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-muted">
                      {awardee.avatar_url ? (
                        <Image
                          src={awardee.avatar_url}
                          alt={awardee.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary">
                          <AvatarSVG name={awardee.name} size={48} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <h3 className="text-lg font-semibold capitalize">{awardee.name}</h3>
                        <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          <span>
                            {awardee.country ?? "Across Africa"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col justify-center">
                        {awardee.cgpa && (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-muted-foreground">CGPA</span>
                              <div className="font-bold text-primary">{awardee.cgpa}</div>
                          </div>
                          <Link
                            href={`/awardees/${awardee.slug}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition hover:bg-primary/20"
                            aria-label={`View ${awardee.name}'s profile`}
                          >
                            <ArrowRight className="h-4 w-4 text-primary" />
                          </Link>
                        </div>
                      )}
                    </div>
                    {!awardee.cgpa && (
                      <div className="flex justify-end">
                        <Link
                          href={`/awardees/${awardee.slug}`}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition hover:bg-primary/20"
                          aria-label={`View ${awardee.name}'s profile`}
                        >
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </motion.div>

            {/* Mobile auto-scrolling indicators */}
            {isMobile && safeAwardees.length > 0 && (
              <div className="flex justify-center mt-4 space-x-2">
                {safeAwardees.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-2 h-2 rounded-full ${
                      idx === currentIndex ? 'bg-primary' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to awardee ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
        </div>

        {/* View More Button */}
        <div className="flex justify-center">
          <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white border border-orange-400">
            <Link href="/awardees" className="text-base sm:text-lg flex items-center gap-2">
              <span>View All Awardees</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
