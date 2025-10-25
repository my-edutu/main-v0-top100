import type { BlogContentBlock, BlogPost } from "@/content/data/blog-posts"

export type ResolvedPostStatus = "published" | "draft"

export interface ResolvedPost {
  id: string
  title: string
  slug: string
  author: string
  excerpt: string
  contentHtml: string
  tags: string[]
  coverImage: string | null
  createdAt: string
  updatedAt: string
  readTime: number
  isFeatured: boolean
  status: ResolvedPostStatus
}

export const DEFAULT_POST_AUTHOR = "Top100 Africa Future Leaders"

const generateId = (fallback?: unknown): string => {
  if (typeof fallback === "string" && fallback.trim().length > 0) {
    return fallback
  }

  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

const sanitizeHtml = (html: string): string => {
  if (!html) return ""

  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on[a-zA-Z]+="[^"]*"/g, "")
    .replace(/javascript:/gi, "")
}

export const stripHtml = (html: string): string => sanitizeHtml(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

export const estimateReadTime = (text: string): number => {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 180))
}

export const buildExcerpt = (text: string, maxLength: number = 220): string => {
  if (!text) return ""

  if (text.length <= maxLength) {
    return text
  }

  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(" ")
  return `${truncated.slice(0, lastSpace > 40 ? lastSpace : truncated.length)}…`
}

const renderBlockToHtml = (block: BlogContentBlock): string => {
  switch (block.type) {
    case "heading":
      return `<h2>${block.text}</h2>`
    case "paragraph":
      return `<p>${block.text}</p>`
    case "list": {
      const items = block.items.map((item) => `<li>${item}</li>`).join("")
      const intro = block.intro ? `<p>${block.intro}</p>` : ""
      return `${intro}<ul>${items}</ul>`
    }
    case "cta":
      if (block.href) {
        return `<p><a href="${block.href}">${block.text}</a></p>`
      }
      return `<p>${block.text}</p>`
    default:
      return ""
  }
}

export const mapStaticPost = (post: BlogPost): ResolvedPost => {
  const contentHtml = post.content.map(renderBlockToHtml).join("\n")
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    author: post.author ?? DEFAULT_POST_AUTHOR,
    excerpt: post.excerpt ?? buildExcerpt(stripHtml(contentHtml)),
    contentHtml: sanitizeHtml(contentHtml),
    tags: Array.isArray(post.tags) ? post.tags : [],
    coverImage: post.coverImage ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    readTime: post.readTime ?? estimateReadTime(stripHtml(contentHtml)),
    isFeatured: Boolean(post.isFeatured),
    status: post.status,
  }
}

const normalizeTags = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
  }

  if (typeof raw === "string" && raw.length > 0) {
    return raw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  return []
}

const toIsoString = (value: unknown): string => {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return new Date().toISOString()
}

export const mapSupabaseRecord = (record: Record<string, unknown>): ResolvedPost => {
  const contentValue = typeof record["content"] === "string" ? record["content"] : ""
  const contentHtml = sanitizeHtml(contentValue)
  const plainText = stripHtml(contentHtml)
  const createdAt = toIsoString(record["created_at"] ?? record["createdAt"])
  const updatedAt = toIsoString(record["updated_at"] ?? record["updatedAt"] ?? createdAt)

  return {
    id: generateId(record["id"] ?? record["slug"]),
    title: typeof record["title"] === "string" ? record["title"] : "Untitled story",
    slug: generateId(record["slug"] ?? record["id"]),
    author:
      typeof record["author"] === "string" && record["author"].trim().length > 0
        ? (record["author"] as string)
        : DEFAULT_POST_AUTHOR,
    excerpt:
      typeof record["excerpt"] === "string" && record["excerpt"].trim().length > 0
        ? (record["excerpt"] as string)
        : buildExcerpt(plainText),
    contentHtml,
    tags: normalizeTags(record["tags"]),
    coverImage:
      typeof record["cover_image"] === "string" && record["cover_image"].length > 0
        ? (record["cover_image"] as string)
        : typeof record["coverImage"] === "string" && record["coverImage"].length > 0
          ? (record["coverImage"] as string)
          : null,
    createdAt,
    updatedAt,
    readTime:
      typeof record["read_time"] === "number" && Number.isFinite(record["read_time"])
        ? Math.max(1, Math.round(record["read_time"] as number))
        : typeof record["readTime"] === "number" && Number.isFinite(record["readTime"])
          ? Math.max(1, Math.round(record["readTime"] as number))
          : estimateReadTime(plainText),
    isFeatured: Boolean(record["is_featured"] ?? record["isFeatured"]),
    status:
      typeof record["status"] === "string" && record["status"].toLowerCase() === "published"
        ? "published"
        : "draft",
  }
}

export const mergePosts = (primary: ResolvedPost[], fallback: ResolvedPost[]): ResolvedPost[] => {
  const merged = new Map<string, ResolvedPost>()

  primary.forEach((post) => {
    merged.set(post.slug, post)
  })

  fallback.forEach((post) => {
    if (!merged.has(post.slug)) {
      merged.set(post.slug, post)
    }
  })

  return Array.from(merged.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export const selectHomepagePosts = (posts: ResolvedPost[], total: number = 6, featuredLimit: number = 3): ResolvedPost[] => {
  const published = posts.filter((post) => post.status === "published")
  const featured = published.filter((post) => post.isFeatured).slice(0, featuredLimit)
  const remainingSlots = Math.max(0, total - featured.length)
  const additional = published
    .filter((post) => !featured.some((feat) => feat.slug === post.slug))
    .slice(0, remainingSlots)

  return [...featured, ...additional]
}
