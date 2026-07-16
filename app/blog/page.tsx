import type { Metadata } from "next";
import { Newspaper } from "lucide-react";

import type { ResolvedPost } from "@/lib/posts";
import { getPublishedPosts } from "@/lib/posts/server";
import { SITE_URL } from "@/lib/site";

import { BlogCard } from "./BlogCard";
import { Pagination } from "./Pagination";

export const revalidate = 300;

const POSTS_PER_PAGE = 9;

const PAGE_TITLE = "Stories & Insights from Africa's Future Leaders";
const PAGE_DESCRIPTION =
  "Essays, partnership spotlights, and leadership lessons from the Top100 Africa Future Leaders network — 400+ awardees across 31 countries.";

type BlogPageProps = {
  // Next 15 passes searchParams as a promise.
  searchParams?: Promise<{ page?: string }>;
};

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const page = Number((await searchParams)?.page ?? 1);
  const currentPage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
  const isFirstPage = currentPage === 1;

  // Paginated pages get their own title and a self-referencing canonical so
  // Google indexes them as distinct pages rather than duplicates of page 1.
  const title = isFirstPage ? PAGE_TITLE : `${PAGE_TITLE} — Page ${currentPage}`;
  const canonical = isFirstPage ? "/blog" : `/blog?page=${currentPage}`;

  return {
    title,
    description: PAGE_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: `${SITE_URL}${canonical}`,
      title,
      description: PAGE_DESCRIPTION,
      siteName: "Top100 Africa Future Leaders",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: PAGE_DESCRIPTION,
    },
  };
}

const sortByDateDesc = (a: ResolvedPost, b: ResolvedPost) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const rawPage = Number((await searchParams)?.page ?? 1);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? Math.trunc(rawPage) : 1;

  const publishedPosts = [...(await getPublishedPosts())].sort(sortByDateDesc);

  const featuredPosts = publishedPosts.filter((post) => post.isFeatured);
  const regularPosts = publishedPosts.filter((post) => !post.isFeatured);

  const totalPages = Math.max(1, Math.ceil(regularPosts.length / POSTS_PER_PAGE));
  // Clamp so /blog?page=999 shows the last page instead of an empty grid.
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const currentPosts = regularPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  // Featured stories headline the first page only; paging is about the archive.
  const showFeatured = featuredPosts.length > 0 && currentPage === 1;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: PAGE_TITLE,
    itemListElement: currentPosts.map((post, index) => ({
      "@type": "ListItem",
      position: startIndex + index + 1,
      url: `${SITE_URL}/blog/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <div className="min-h-screen bg-white py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <div className="container mx-auto max-w-6xl px-4">
        <header className="mb-14 max-w-3xl">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
            Stories &amp; Insights from Africa&rsquo;s Future Leaders
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            Explore essays, partnership spotlights, and leadership lessons from the Top100 network.
          </p>
        </header>

        {showFeatured && (
          <section aria-labelledby="featured-heading" className="mb-16">
            <h2
              id="featured-heading"
              className="mb-6 text-sm font-semibold uppercase tracking-wider text-zinc-500"
            >
              Featured stories
            </h2>

            {/* The lead story runs wide; the rest sit beside it. This keeps any
                count (1, 2, 3, 4+) from stranding a lone card in a half-empty row. */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-3">
                <BlogCard post={featuredPosts[0]} variant="featured" priority />
              </div>
              {featuredPosts.slice(1).map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        <section id="all-stories" aria-labelledby="all-stories-heading" className="scroll-mt-24">
          <div className="mb-6">
            <h2
              id="all-stories-heading"
              className="text-sm font-semibold uppercase tracking-wider text-zinc-500"
            >
              All stories
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Every article from our editorial desk, newest first.
            </p>
          </div>

          {currentPosts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-white">
                <Newspaper className="h-6 w-6 text-zinc-400" aria-hidden="true" />
              </span>
              <p className="max-w-sm text-zinc-600">
                No additional stories yet. Check back soon for more updates from the network.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {currentPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={(page) => (page === 1 ? "/blog#all-stories" : `/blog?page=${page}#all-stories`)}
          />
        </section>
      </div>
    </div>
  );
}
