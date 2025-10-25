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
        <div className="relative overflow-hidden">
          <Image
            src={post.coverImage || "/placeholder.svg"}
            alt={post.title}
            width={800}
            height={400}
            className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              post.isFeatured ? 'h-64' : 'h-48'
            }`}
          />
          <div className="absolute top-4 left-4">
            {post.tags && post.tags.length > 0 && (
              <Badge className="bg-orange-500/90 text-white backdrop-blur-sm">
                {post.tags[0]}
              </Badge>
            )}
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </div>

        <div className="p-6">
          <div className="flex items-center text-sm text-zinc-400 mb-3">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            <span className="mx-2">{'\u2022'}</span>
            <span>{post.readTime ? `${post.readTime} min read` : "Read"}</span>
          </div>

          <h3 className={`mb-3 text-white group-hover:text-orange-300 transition-colors ${
            post.isFeatured ? 'text-xl font-bold' : 'text-lg font-semibold'
          }`}>
            {post.title}
          </h3>

          <p className="text-zinc-300 mb-4 text-pretty">
            {post.excerpt}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-zinc-400">
              <User className="w-4 h-4 mr-2" />
              <span>{post.author}</span>
            </div>

            <div className="flex items-center text-orange-400 group-hover:text-orange-300 transition-colors">
              <span className="text-sm font-medium mr-2">Read more</span>
              <svg 
                className="w-4 h-4 group-hover:translate-x-1 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
