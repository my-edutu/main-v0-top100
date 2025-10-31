import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock } from "lucide-react";

import { getPostBySlug, getRelatedPosts } from "@/lib/posts/server";
import { SimpleBlogCard } from "../SimpleBlogCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Story not found | Top100 Africa Future Leaders",
      description: "The requested story could not be located.",
    };
  }

  return {
    title: `${post.title} | Top100 Africa Future Leaders`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.slug, 2);

  return (
    <div className="min-h-screen bg-black py-16">
      <div className="container mx-auto max-w-5xl px-4">
        <article className="overflow-hidden rounded-3xl border border-zinc-800 bg-black/50 backdrop-blur-xl">
          {/* Header section */}
          <div className="p-8 md:p-10 pb-4">
            <h1 className="text-3xl font-semibold text-white md:text-4xl mb-2">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {post.readTime} min read
              </span>
            </div>
          </div>

          {/* Image section */}
          <div className="relative h-80 w-full overflow-hidden md:h-96">
            <Image
              src={post.coverImage || "/placeholder.svg"}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Content section */}
          <div className="space-y-6 p-8 md:p-10">
            <div
              className="prose prose-invert max-w-none space-y-6 text-lg leading-relaxed text-zinc-300"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          </div>
        </article>

        {relatedPosts.length > 0 && (
          <section className="mt-16 space-y-6">
            <h2 className="text-2xl font-semibold text-white">Keep exploring</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {relatedPosts.map((related) => (
                <SimpleBlogCard key={related.id} post={related} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
