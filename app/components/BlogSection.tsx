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
      <div className="container flex flex-col gap-10">
        <div className="text-center">
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Stories &amp; insights shaping the continent
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Dive into six of our latest features—leadership lessons, partnership spotlights, and community wins from the Top100 network.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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
                className={`group flex h-full overflow-hidden rounded-3xl border border-border/60 shadow-md transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl ${index % 4 === 0
                  ? "bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20"
                  : index % 4 === 1
                    ? "bg-gradient-to-br from-purple-50 to-pink-50/50 dark:from-purple-950/30 dark:to-pink-950/20"
                    : index % 4 === 2
                      ? "bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20"
                      : "bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20"
                  } flex-col`}
              >
                {/* Image - Portrait on mobile, optimized on desktop */}
                <div className="relative w-full aspect-[3/4] sm:aspect-[16/10] overflow-hidden">
                  <Image
                    src={post.coverImage || "/placeholder.svg"}
                    alt={post.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                  <div className="space-y-2">
                    <h3 className="text-lg sm:text-xl font-bold leading-tight transition-colors group-hover:text-primary line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/30">
                    <span className="text-xs font-medium text-muted-foreground/70">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition group-hover:text-primary/80">
                      Read story
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <Button size="lg" variant="soft" className="px-6 border border-orange-400 text-base" asChild>
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
