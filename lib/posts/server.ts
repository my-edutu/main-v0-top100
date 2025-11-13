import { cache } from "react"

import { blogPosts } from "@/content/data/blog-posts"
import { createClient } from "@/lib/supabase/server"

import { mapStaticPost, mapSupabaseRecord, mergePosts, ResolvedPost, selectHomepagePosts } from "../posts"

const fetchSupabasePosts = async (): Promise<ResolvedPost[]> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })

    if (error || !data) {
      if (error) {
        console.warn("[posts] Failed to fetch Supabase posts", error)
      }
      return []
    }

    return data.map(mapSupabaseRecord)
  } catch (error) {
    console.warn("[posts] Supabase client unavailable", error)
    return []
  }
}

const fetchSupabasePostBySlug = async (slug: string): Promise<ResolvedPost | null> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("posts").select("*").eq("slug", slug).maybeSingle()

    if (error || !data) {
      return null
    }

    return mapSupabaseRecord(data)
  } catch (error) {
    console.warn(`[posts] Supabase post unavailable for slug ${slug}`, error)
    return null
  }
}

const staticPosts = blogPosts.map(mapStaticPost)

export const getAllResolvedPosts = cache(async (): Promise<ResolvedPost[]> => {
  const supabasePosts = await fetchSupabasePosts()
  return mergePosts(supabasePosts, staticPosts)
})

export const getPublishedPosts = cache(async (): Promise<ResolvedPost[]> => {
  const posts = await getAllResolvedPosts()
  return posts.filter((post) => post.status === "published")
})

export const getHomepagePosts = cache(async (): Promise<ResolvedPost[]> => {
  const posts = await getPublishedPosts()
  return selectHomepagePosts(posts)
})

export const getPostBySlug = cache(async (slug: string): Promise<ResolvedPost | null> => {
  const supabasePost = await fetchSupabasePostBySlug(slug)
  if (supabasePost) {
    return supabasePost
  }

  const fallback = staticPosts.find((post) => post.slug === slug)
  return fallback ?? null
})

export const getRelatedPosts = cache(async (slug: string, limit: number = 2): Promise<ResolvedPost[]> => {
  const posts = await getPublishedPosts()
  return posts.filter((post) => post.slug !== slug).slice(0, limit)
})
