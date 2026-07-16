import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ResolvedPost } from "@/lib/posts";

interface SimpleBlogCardProps {
  post: ResolvedPost;
}

export function SimpleBlogCard({ post }: SimpleBlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2"
    >
      <h3 className="text-lg font-semibold leading-snug tracking-tight text-zinc-950 transition-colors group-hover:text-orange-700">
        {post.title}
      </h3>
      {post.excerpt && (
        <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600">{post.excerpt}</p>
      )}
      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-orange-700">
        Read story
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
