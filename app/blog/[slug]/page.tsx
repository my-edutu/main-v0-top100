import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";

import BlogCover from "@/components/BlogCover";
import { getPostBySlug, getRelatedPosts } from "@/lib/posts/server";
import { SimpleBlogCard } from "../SimpleBlogCard";
import StructuredData from "@/components/StructuredData";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Story not found | Top100 Africa Future Leaders",
      description: "The requested story could not be located.",
    };
  }

  const imageUrl = post.coverImage || '/magazine-cover-2025.jpg';

  return {
    title: `${post.title} | Top100 Africa Future Leaders`,
    description: post.excerpt,
    keywords: ['Top100 Africa Future Leaders', 'African youth leaders', 'African leadership', 'African innovation', post.title],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        }
      ],
      type: 'article',
      publishedTime: post.createdAt,
      url: `https://www.top100afl.org/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [imageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(slug, 2);

  // BlogPosting Schema for SEO
  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": post.coverImage || '/magazine-cover-2025.jpg',
    "datePublished": post.createdAt,
    "dateModified": post.updatedAt || post.createdAt,
    "description": post.excerpt,
    "author": {
      "@type": "Organization",
      "name": "Top100 Africa Future Leaders",
      "url": "https://www.top100afl.org"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Top100 Africa Future Leaders",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.top100afl.org/Top100 Africa Future leaders Logo .png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.top100afl.org/blog/${post.slug}`
    },
    "wordCount": post.contentHtml?.split(' ').length || 0,
    "timeRequired": `PT${post.readTime}M`
  }

  return (
    <div className="min-h-screen bg-black py-16">
      <StructuredData data={blogPostingSchema} />
      <div className="container mx-auto max-w-5xl px-4">
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-orange-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to stories
        </Link>

        <article className="overflow-hidden rounded-3xl border border-zinc-800 bg-black/50 backdrop-blur-xl">
          {/* Header section */}
          <div className="p-8 md:p-10 pb-4">
            <h1 className="text-3xl font-semibold text-white md:text-4xl mb-3">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
              {post.createdAt && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {new Date(post.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {post.readTime ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {post.readTime} min read
                </span>
              ) : null}
            </div>
          </div>

          {/* Image section */}
          <div className="relative h-80 w-full overflow-hidden md:h-96">
            <BlogCover
              imageUrl={post.coverImage}
              title={post.title}
              className="h-full w-full"
              priority
              variant="hero"
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
