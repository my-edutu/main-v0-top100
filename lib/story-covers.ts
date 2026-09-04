import type { ResolvedPost } from "@/lib/posts"

const SLUG_COVERS: Readonly<Record<string, string>> = {
  "one-young-world-partners-with-top100": "/blog/Top100 Africa Future Leaders patners with one young world.png",
  "from-first-class-graduate-to-global-leader": "/IMG_0680.jpg",
  "the-power-of-peer-networks": "/IMG_0672.jpg",
}

const CURATED_COVERS = [
  "/IMG_0674.jpg",
  "/IMG_0677.jpg",
  "/IMG_0679.jpg",
  "/IMG_0681.jpg",
  "/IMG_0683.jpg",
  "/IMG_0685.jpg",
] as const

function isUsableCover(coverImage?: string | null): coverImage is string {
  return Boolean(coverImage && !coverImage.startsWith("/placeholder"))
}

export function resolveStoryCover(
  post: Pick<ResolvedPost, "slug" | "coverImage">,
  index: number,
): string {
  return resolveStoryCoverCandidates(post, index)[0]
}

export function resolveStoryCoverCandidates(
  post: Pick<ResolvedPost, "slug" | "coverImage">,
  index: number,
): string[] {
  const curatedCover = CURATED_COVERS[Math.abs(index) % CURATED_COVERS.length]
  const candidates = [
    isUsableCover(post.coverImage) ? post.coverImage : null,
    SLUG_COVERS[post.slug],
    curatedCover,
  ].filter((cover): cover is string => Boolean(cover))

  return [...new Set(candidates)]
}
