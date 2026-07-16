import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";

import BlogCover from "@/components/BlogCover";
import { getPostBySlug, getRelatedPosts } from "@/lib/posts/server";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SimpleBlogCard } from "../SimpleBlogCard";
import StructuredData from "@/components/StructuredData";

export const revalidate = 300;

// Seed posts carry a /placeholder.svg cover; a grey stock box is a poor
// social-share card, so fall back to the magazine cover instead.
const shareImage = (coverImage: string | null) =>
  coverImage && !coverImage.startsWith("/placeholder.svg")
    ? coverImage
    : "/magazine-cover-2025.jpg";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Story not found",
      description: "The requested story could not be located.",
      robots: { index: false },
    };
  }

  // Admins can set SEO overrides per post; fall back to the content itself.
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt;
  const keywords = post.metaKeywords
    ? post.metaKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean)
    : [...post.tags, "Top100 Africa Future Leaders", "African youth leaders"];
  const canonical = `/blog/${post.slug}`;
  const imageUrl = shareImage(post.coverImage);

  return {
    title,
    description,
    keywords,
    authors: [{ name: post.author }],
    alternates: { canonical },
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: post.coverImageAlt ?? post.title }],
      type: "article",
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt || post.createdAt,
      authors: [post.author],
      tags: post.tags,
      url: `${SITE_URL}${canonical}`,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

  const plainText = post.contentHtml?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() ?? "";
  const coverUrl = shareImage(post.coverImage);

  // BlogPosting Schema for SEO
  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": coverUrl.startsWith("http") ? coverUrl : `${SITE_URL}${coverUrl}`,
    "datePublished": post.createdAt,
    "dateModified": post.updatedAt || post.createdAt,
    "description": post.metaDescription || post.excerpt,
    "keywords": post.tags.join(", "),
    "author": {
      "@type": "Organization",
      "name": post.author || SITE_NAME,
      "url": SITE_URL
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/${encodeURIComponent("Top100 Africa Future leaders Logo .png")}`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`
    },
    "wordCount": plainText ? plainText.split(" ").length : 0,
    "timeRequired": `PT${post.readTime}M`
  }

  return (
    <div className="min-h-screen bg-white py-16">
      <StructuredData data={blogPostingSchema} />
      <div className="container mx-auto max-w-5xl px-4">
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-orange-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to stories
        </Link>

        <article className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white">
          {/* Header section */}
          <div className="p-8 md:p-10 pb-4">
            <h1 className="mb-3 text-balance text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
              {post.createdAt && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={post.createdAt}>
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
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
              title={post.coverImageAlt ?? post.title}
              className="h-full w-full"
              priority
              variant="hero"
            />
          </div>

          {/* Content section */}
          <div className="space-y-6 p-8 md:p-10">
            <div
              className="prose prose-zinc max-w-none space-y-6 text-lg leading-relaxed text-zinc-700 prose-headings:tracking-tight prose-a:text-orange-700"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          </div>
        </article>

        {relatedPosts.length > 0 && (
          <section className="mt-16 space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Keep exploring</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
