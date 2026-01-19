"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ResolvedPost } from "@/lib/posts"

export default function BlogSection() {
  const [posts, setPosts] = useState<ResolvedPost[]>([])

  useEffect(() => {
    let isMounted = true

    const loadPosts = async () => {
      try {
        const response = await fetch("/api/posts?scope=homepage", { cache: "no-store" })
        if (!response.ok) {
          console.error("Failed to load homepage posts", response.statusText)
          return
        }

        const payload = await response.json()
        if (!Array.isArray(payload)) {
          return
        }

        if (isMounted) {
          // Limit to 6 posts for homepage display
          setPosts(payload.slice(0, 6))
        }
      } catch (error) {
        console.error("Error fetching homepage posts", error)
      }
    }

    loadPosts()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section id="blog" className="section-padding">
      <div className="container flex flex-col gap-6 md:gap-10">
        <div className="text-center">
          <h2 className="mt-2 md:mt-4 text-2xl font-semibold sm:text-3xl md:text-4xl">
            Stories &amp; insights shaping the continent
          </h2>
          <p className="mx-auto mt-2 md:mt-3 max-w-2xl text-xs sm:text-sm text-muted-foreground md:text-base">
            Dive into our latest features—leadership lessons, partnership spotlights, and community wins.
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className={`group flex h-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 shadow-sm sm:shadow-md transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl ${index % 4 === 0
                  ? "bg-gradient-to-br from-blue-50 to-indigo-50/50"
                  : index % 4 === 1
                    ? "bg-gradient-to-br from-purple-50 to-pink-50/50"
                    : index % 4 === 2
                      ? "bg-gradient-to-br from-amber-50 to-orange-50/50"
                      : "bg-gradient-to-br from-emerald-50 to-teal-50/50"
                  } flex-row sm:flex-col`}
              >
                {/* Image - Compact square on mobile, larger on desktop */}
                <div className="relative w-28 h-28 sm:w-full sm:h-auto sm:aspect-[16/10] flex-shrink-0 overflow-hidden">
                  <Image
                    src={post.coverImage || "/placeholder.svg"}
                    alt={post.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 112px, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-1 sm:gap-3 p-3 sm:p-5 md:p-6">
                  <div className="space-y-1 sm:space-y-2">
                    <h3 className="text-sm sm:text-lg md:text-xl font-bold leading-tight transition-colors group-hover:text-primary line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-[0.65rem] sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {post.excerpt ? (post.excerpt.length > 80 ? post.excerpt.substring(0, 80) + '...' : post.excerpt) : ''}
                    </p>
                  </div>
                  <div className="mt-auto pt-1 sm:pt-3 flex items-center justify-between sm:border-t sm:border-border/30">
                    <span className="text-[0.6rem] sm:text-xs font-medium text-muted-foreground/70">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-primary transition group-hover:text-primary/80">
                      Read
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-2 sm:mt-4 flex justify-center">
          <Button size="lg" variant="soft" className="px-4 sm:px-6 border border-orange-400 text-sm sm:text-base" asChild>
            <Link href="/blog">
              Explore all stories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
