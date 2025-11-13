import Link from "next/link";
import Image from "next/image";
import { Calendar, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ResolvedPost } from "@/lib/posts";

interface BlogCardProps {
  post: ResolvedPost;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <article className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-zinc-800 hover:border-orange-400/40 transition-all duration-300">
        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* Small Image */}
          <div className="relative flex-shrink-0 w-full md:w-48 h-40 md:h-32 rounded-xl overflow-hidden">
            <Image
              src={post.coverImage || "/placeholder.svg"}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 192px"
            />
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center text-sm text-zinc-400 mb-2">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              <span className="mx-2">{'\u2022'}</span>
              <span>{post.readTime ? `${post.readTime} min read` : "Read"}</span>
            </div>

            <h3 className={`mb-2 text-white group-hover:text-orange-300 transition-colors ${
              post.isFeatured ? 'text-xl font-bold' : 'text-lg font-semibold'
            }`}>
              {post.title}
            </h3>

            <p className="text-zinc-300 mb-3 text-sm line-clamp-2 flex-1">
              {post.excerpt}
            </p>

            <div className="flex items-center justify-between mt-auto">
              <div className="text-sm text-zinc-400">&nbsp;</div>

              <div className="flex items-center text-orange-400 group-hover:text-orange-300 transition-colors">
                <span className="hidden md:inline text-sm font-medium mr-2">Read more</span>
                <span className="flex items-center justify-center h-8 w-8 md:h-auto md:w-auto md:border-0 border-2 border-orange-400 rounded-full transition-all duration-200 group-hover:scale-110 group-hover:bg-orange-400/10">
                  <svg
                    className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
