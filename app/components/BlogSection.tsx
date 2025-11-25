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

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                className={`group flex h-full overflow-hidden rounded-[28px] border border-border/60 shadow-md transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg ${
                  index % 4 === 0
                    ? "bg-blue-50/80 dark:bg-blue-950/20"
                    : index % 4 === 1
                    ? "bg-purple-50/80 dark:bg-purple-950/20"
                    : index % 4 === 2
                    ? "bg-amber-50/80 dark:bg-amber-950/20"
                    : "bg-emerald-50/80 dark:bg-emerald-950/20"
                } flex-row gap-4 p-4 md:flex-col md:gap-0 md:p-0`}
              >
                {/* Mobile: Small image on left | Desktop: Large image on top */}
                <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden md:w-full md:h-auto md:aspect-[4/3] md:rounded-none">
                  <Image
                    src={post.coverImage || "/placeholder.svg"}
                    alt={post.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 96px, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-2 md:gap-5 md:p-6">
                  <div className="flex items-center gap-2 md:gap-3 text-xs md:text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1 md:gap-2">
                      <Calendar className="h-4 w-4 md:h-4 md:w-4" />
                      <span className="hidden md:inline">{new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}</span>
                      <span className="md:hidden">{new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}</span>
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{post.readTime ? `${post.readTime} min` : "Read"}</span>
                  </div>
                  <div className="space-y-1 md:space-y-3">
                    <h3 className="text-base md:text-lg font-semibold leading-tight transition-colors group-hover:text-primary line-clamp-2 md:line-clamp-none">
                      {post.title}
                    </h3>
                    <p className="hidden md:block line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                    <p className="md:hidden text-sm text-muted-foreground">{post.excerpt}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between text-xs md:text-sm font-medium text-muted-foreground">
                    <span className="text-[0.65rem] md:text-sm">&nbsp;</span>
                    <span className="inline-flex items-center gap-1 md:gap-2 text-primary transition group-hover:text-primary/80">
                      <span className="hidden md:inline text-[0.65rem] md:text-sm">Read more</span>
                      <span className="flex items-center justify-center h-6 w-6 md:h-auto md:w-auto md:border-0 border-2 border-primary rounded-full transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/10">
                        <ArrowRight className="h-3 w-3 md:h-4 md:w-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <Button size="lg" variant="soft" className="px-6" asChild>
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
