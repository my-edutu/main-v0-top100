"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Calendar, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { blogPosts } from "@/content/data/blog-posts"
import { mapStaticPost, ResolvedPost, selectHomepagePosts } from "@/lib/posts"

const fallbackPosts = blogPosts.map(mapStaticPost)
const fallbackHomepage = selectHomepagePosts(fallbackPosts)

export default function BlogSection() {
  const [posts, setPosts] = useState<ResolvedPost[]>(fallbackHomepage)

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

        const merged = new Map<string, ResolvedPost>()
        for (const post of payload as ResolvedPost[]) {
          if (post && typeof post.slug === "string") {
            merged.set(post.slug, post)
          }
        }

        for (const fallback of fallbackHomepage) {
          if (!merged.has(fallback.slug)) {
            merged.set(fallback.slug, fallback)
          }
        }

        const normalized = selectHomepagePosts(Array.from(merged.values()))

        if (isMounted) {
          setPosts(normalized)
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
    <section id="blog">
      <div className="container flex flex-col gap-10">
        <div className="text-center">
          <Badge variant="soft" className="mx-auto rounded-full text-xs uppercase tracking-[0.32em]">
            From the journal
          </Badge>
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
                className={`group flex h-full flex-col overflow-hidden rounded-[28px] border border-border/60 shadow-md transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg ${
                  index % 4 === 0 
                    ? "bg-blue-50/80 dark:bg-blue-950/20" 
                    : index % 4 === 1 
                    ? "bg-purple-50/80 dark:bg-purple-950/20" 
                    : index % 4 === 2 
                    ? "bg-amber-50/80 dark:bg-amber-950/20" 
                    : "bg-emerald-50/80 dark:bg-emerald-950/20"
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={post.coverImage || "/placeholder.svg"}
                    alt={post.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute left-4 top-4">
                    <Badge variant="soft" className="rounded-full text-[0.7rem]">
                      {post.tags.at(0) ?? "Feature"}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-5 p-6">
                  <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{post.readTime ? `${post.readTime} min read` : "Read"}</span>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold leading-tight transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between text-sm font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {post.author}
                    </span>
                    <span className="inline-flex items-center gap-2 text-primary transition group-hover:text-primary/80">
                      Read more
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Browse the full archive of interviews, essays, and programme recaps.
          </p>
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

