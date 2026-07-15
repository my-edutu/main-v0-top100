import Link from "next/link";
import { Newspaper } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ResolvedPost } from "@/lib/posts";
import { getPublishedPosts } from "@/lib/posts/server";

import { BlogCard } from "./BlogCard";

export const revalidate = 300;

const POSTS_PER_PAGE = 6;

const sortByDateDesc = (a: ResolvedPost, b: ResolvedPost) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export default async function BlogPage({ searchParams }: { searchParams?: { page?: string } }) {
  const rawPage = Number(searchParams?.page ?? 1);
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const publishedPosts = [...(await getPublishedPosts())].sort(sortByDateDesc);

  const featuredPosts = publishedPosts.filter((post) => post.isFeatured);
  const regularPosts = publishedPosts.filter((post) => !post.isFeatured);

  const totalPages = Math.max(1, Math.ceil(regularPosts.length / POSTS_PER_PAGE));
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const currentPosts = regularPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="min-h-screen bg-black py-16">
      <div className="container mx-auto max-w-6xl px-4">
        <header className="mb-16 text-center">
          <h1 className="mt-4 text-4xl font-semibold text-white md:text-5xl">
            Stories &amp; Insights from Africa&rsquo;s Future Leaders
          </h1>
          <p className="mt-4 text-lg text-zinc-400 md:text-xl">
            Explore essays, partnership spotlights, and leadership lessons from the Top100 network.
          </p>
        </header>

        {featuredPosts.length > 0 && (
          <section className="mb-16 space-y-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-semibold text-white md:text-3xl">
                  Featured Stories
                </h2>
              </div>
            </div>

            <div className="space-y-6">
              {featuredPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        <section id="all-stories" className="space-y-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                All Stories
              </h2>
              <p className="mt-2 text-sm text-zinc-400 md:text-base">
                Explore every article from our editorial desk, archived by the latest publish date.
              </p>
            </div>
          </div>

          {currentPosts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-black/40 px-6 py-16 text-center text-zinc-400">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60">
                <Newspaper className="h-6 w-6 text-zinc-500" aria-hidden="true" />
              </span>
              <p className="max-w-sm">No additional stories yet. Check back soon for more updates from the network.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {currentPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800 pt-6 md:flex-row">
              <Button
                variant="outline"
                asChild
                disabled={!hasPreviousPage}
                className={`w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black md:w-auto ${
                  !hasPreviousPage ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <Link
                  aria-disabled={!hasPreviousPage}
                  tabIndex={!hasPreviousPage ? -1 : undefined}
                  href={`/blog?page=${Math.max(1, currentPage - 1)}`}
                >
                  Previous Page
                </Link>
              </Button>

              <p className="text-sm text-zinc-400">
                Page {currentPage} of {totalPages}
              </p>

              <Button
                variant="outline"
                asChild
                disabled={!hasNextPage}
                className={`w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black md:w-auto ${
                  !hasNextPage ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <Link
                  aria-disabled={!hasNextPage}
                  tabIndex={!hasNextPage ? -1 : undefined}
                  href={`/blog?page=${Math.min(totalPages, currentPage + 1)}`}
                >
                  Next Page
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
