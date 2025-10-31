import Link from "next/link";

import type { ResolvedPost } from "@/lib/posts";

interface SimpleBlogCardProps {
  post: ResolvedPost;
}

export function SimpleBlogCard({ post }: SimpleBlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col gap-4 rounded-2xl border border-zinc-800 bg-black/40 p-6 transition hover:border-orange-400/40"
    >
      <h3 className="text-lg font-semibold text-white group-hover:text-orange-200">
        {post.title}
      </h3>
      <span className="text-sm font-semibold text-orange-300">
        Read story &rarr;
      </span>
    </Link>
  );
}