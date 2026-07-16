import Link from "next/link";
import { ArrowRight } from "lucide-react";

import BlogCover from "@/components/BlogCover";
import type { ResolvedPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

interface BlogCardProps {
  post: ResolvedPost;
  /** "featured" lays the card out side-by-side from md up. */
  variant?: "default" | "featured";
  priority?: boolean;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export function BlogCard({ post, variant = "default", priority = false }: BlogCardProps) {
  const isFeatured = variant === "featured";
  const published = formatDate(post.createdAt);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2"
    >
      <article
        className={cn(
          "flex h-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-900/5",
          isFeatured ? "flex-col md:flex-row" : "flex-col",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden",
            isFeatured
              ? "aspect-[16/10] md:aspect-auto md:w-[42%] md:flex-shrink-0"
              : "aspect-[16/9]",
          )}
        >
          <BlogCover
            imageUrl={post.coverImage}
            title={post.coverImageAlt ?? post.title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
            priority={priority}
            variant={isFeatured ? "hero" : "card"}
            sizes={
              isFeatured
                ? "(max-width: 768px) 100vw, 42vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
          />
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          {post.tags.length > 0 && (
            <span className="mb-3 w-fit rounded-md bg-orange-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              {post.tags[0]}
            </span>
          )}

          <h3
            className={cn(
              "text-balance font-semibold leading-snug tracking-tight text-zinc-950 transition-colors group-hover:text-orange-700",
              isFeatured ? "text-xl sm:text-2xl" : "text-lg",
            )}
          >
            {post.title}
          </h3>

          <p
            className={cn(
              "mt-2 text-sm leading-relaxed text-zinc-600",
              isFeatured ? "line-clamp-3" : "line-clamp-2",
            )}
          >
            {post.excerpt}
          </p>

          <div className="mt-auto flex items-center justify-between gap-4 pt-5">
            <p className="min-w-0 truncate text-xs text-zinc-500">
              {post.author}
              {published && <> · {published}</>}
              {post.readTime > 0 && <> · {post.readTime} min read</>}
            </p>
            <span className="flex flex-shrink-0 items-center gap-1 text-sm font-medium text-orange-700">
              Read
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
