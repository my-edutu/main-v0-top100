"use client"

import { useMemo, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Award } from "lucide-react"

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

export default function HomeFeaturedAwardees({ awardees }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const safeAwardees = useMemo(
    () =>
      awardees.map((entry) => ({
        ...entry,
        slug: entry.slug && entry.slug.trim().length > 0 ? entry.slug : toSlug(entry.name),
      })),
    [awardees],
  )

  // Check if mobile
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

  // Auto-scroll animation for mobile - smooth continuous scrolling
  useEffect(() => {
    if (!isMobile || safeAwardees.length === 0) return;

    let scrollInterval: NodeJS.Timeout;
    let lastInteractionTime = Date.now();
    const INACTIVITY_THRESHOLD = 3000; // Stop auto-scroll after 3 seconds of user interaction

    const startAutoScroll = () => {
      scrollInterval = setInterval(() => {
        // Only auto-scroll if no recent user interaction
        if (Date.now() - lastInteractionTime > INACTIVITY_THRESHOLD) {
          setScrollPosition((prev) => {
            // Each card is ~160px wide (150px + 10px gap)
            const cardWidth = 160;
            const newPosition = prev + 1;

            // Reset when we've scrolled past all cards
            if (newPosition >= cardWidth * safeAwardees.length) {
              return 0;
            }

            return newPosition;
          });
        }
      }, 30); // Smooth 30ms intervals for fluid animation
    };

    startAutoScroll();

    // Function to handle user interaction
    const handleUserInteraction = () => {
      lastInteractionTime = Date.now();
    };

    // Add event listeners for user interactions
    const container = document.querySelector('.mobile-awardees-container');
    if (container) {
      container.addEventListener('touchstart', handleUserInteraction);
      container.addEventListener('touchmove', handleUserInteraction);
      container.addEventListener('mousedown', handleUserInteraction);
      container.addEventListener('mousemove', handleUserInteraction);
    }

    return () => {
      clearInterval(scrollInterval);
      // Clean up event listeners
      if (container) {
        container.removeEventListener('touchstart', handleUserInteraction);
        container.removeEventListener('touchmove', handleUserInteraction);
        container.removeEventListener('mousedown', handleUserInteraction);
        container.removeEventListener('mousemove', handleUserInteraction);
      }
    };
  }, [isMobile, safeAwardees.length]);

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
            <>
              {isMobile ? (
                // Mobile: Auto-scrolling horizontal carousel with 4 visible cards
                <div className="relative overflow-hidden mobile-awardees-container" onMouseDown={(e) => {
                  // Handle manual dragging interaction
                  const startX = e.clientX;
                  const startScrollPos = scrollPosition;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const diff = startX - moveEvent.clientX;
                    setScrollPosition(startScrollPos + diff);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }} onTouchStart={(e) => {
                  // Handle touch dragging interaction
                  const startX = e.touches[0].clientX;
                  const startScrollPos = scrollPosition;

                  const handleTouchMove = (moveEvent: TouchEvent) => {
                    const diff = startX - moveEvent.touches[0].clientX;
                    setScrollPosition(startScrollPos + diff);
                  };

                  const handleTouchEnd = () => {
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                  };

                  document.addEventListener('touchmove', handleTouchMove);
                  document.addEventListener('touchend', handleTouchEnd);
                }}>
                  <div
                    className="flex gap-2 transition-transform"
                    style={{
                      transform: `translateX(-${scrollPosition}px)`,
                      width: `${(safeAwardees.length * 2) * 160}px` // Reduced width for smaller cards
                    }}
                  >
                    {/* Render cards twice for seamless infinite scroll */}
                    {[...safeAwardees, ...safeAwardees].map((awardee, index) => (
                      <Link
                        key={`${awardee.slug}-${index}`}
                        href={`/awardees/${awardee.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-[150px] flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-primary/5"
                      >
                        <div className="relative h-36 w-full overflow-hidden bg-muted">
                          {awardee.avatar_url && !imageErrors.has(awardee.slug) ? (
                            <Image
                              src={awardee.avatar_url}
                              alt={awardee.name}
                              fill
                              className="object-cover"
                              sizes="150px"
                              priority={index < 4} // Prioritize first few images
                              onError={() => {
                                setImageErrors(prev => new Set(prev).add(awardee.slug));
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary">
                              <AvatarSVG name={awardee.name} size={36} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-2">
                          <h3 className="text-xs font-semibold capitalize line-clamp-2">{awardee.name}</h3>
                          {awardee.course && (
                            <p className="text-[0.6rem] text-muted-foreground line-clamp-1">{awardee.course}</p>
                          )}
                          {awardee.cgpa && (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[0.6rem] text-muted-foreground">CGPA</span>
                                <div className="font-bold text-primary text-xs">{awardee.cgpa}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                // Desktop: Standard horizontal scroll
                <motion.div
                  layout
                  className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-3 hide-scrollbar"
                >
                  {safeAwardees.map((awardee, index) => (
                    <motion.article
                      key={awardee.slug}
                      layout
                      initial={{ opacity: 0, x: 24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
                      viewport={{ once: true, amount: 0.35 }}
                      className="flex-shrink-0 w-52 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-primary/5 transition hover:border-primary/40 hover:scale-105 hover:shadow-lg"
                    >
                      <div className="relative h-48 w-full overflow-hidden bg-muted">
                        {awardee.avatar_url && !imageErrors.has(awardee.slug) ? (
                          <Image
                            src={awardee.avatar_url}
                            alt={awardee.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            onError={() => {
                              setImageErrors(prev => new Set(prev).add(awardee.slug));
                            }}
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
                                className="inline-flex items-center gap-1 text-primary transition group-hover:text-primary/80"
                                aria-label={`View ${awardee.name}'s profile`}
                              >
                                <span className="text-xs whitespace-nowrap">Read more</span>
                                <ArrowRight className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
                              </Link>
                            </div>
                          )}
                        </div>
                        {!awardee.cgpa && (
                          <div className="flex justify-end">
                            <Link
                              href={`/awardees/${awardee.slug}`}
                              className="inline-flex items-center gap-1 text-primary transition group-hover:text-primary/80"
                              aria-label={`View ${awardee.name}'s profile`}
                            >
                              <span className="text-xs whitespace-nowrap">Read more</span>
                              <ArrowRight className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </motion.article>
                  ))}
                </motion.div>
              )}
            </>
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