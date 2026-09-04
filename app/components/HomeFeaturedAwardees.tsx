"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AvatarSVG } from "@/lib/avatars"

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

export default function HomeFeaturedAwardees({ awardees }: Props) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const safeAwardees = useMemo(
    () =>
      awardees.map((entry) => ({
        ...entry,
        slug: entry.slug && entry.slug.trim().length > 0 ? entry.slug : toSlug(entry.name),
      })),
    [awardees],
  )

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

        <div className="min-h-[220px] relative overflow-hidden">
          {safeAwardees.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Spotlight awardees will appear here once they are marked as featured in Supabase.
            </div>
          ) : (
            <div
              aria-label="Featured awardees"
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
            >
              {safeAwardees.map((awardee, index) => (
                <Link
                  key={awardee.slug}
                  href={`/awardees/${awardee.slug}`}
                  className="group w-[72vw] max-w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:w-52"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-muted">
                    {awardee.avatar_url && !imageErrors.has(awardee.slug) ? (
                      <Image
                        src={awardee.avatar_url}
                        alt={awardee.name}
                        fill
                        sizes="220px"
                        className="object-cover"
                        priority={index < 3}
                        onError={() => setImageErrors((previous) => new Set(previous).add(awardee.slug))}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary">
                        <AvatarSVG name={awardee.name} size={48} />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold capitalize">{awardee.name}</h3>
                    {awardee.course ? <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{awardee.course}</p> : null}
                    {awardee.cgpa ? <p className="mt-3 text-sm font-semibold text-primary">CGPA {awardee.cgpa}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* View More Button */}
        <div className="flex justify-center">
          <Button asChild size="lg" variant="soft" className="px-6 border border-orange-400 text-base">
            <Link href="/awardees" className="text-base flex items-center gap-2">
              <span>View All Awardees</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
