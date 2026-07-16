import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  /** Builds the href for a page number, e.g. (p) => `/blog?page=${p}`. */
  buildHref: (page: number) => string;
};

/**
 * Returns the page numbers to render, with `null` marking a gap.
 * Always keeps the first page, the last page, and a window around the current
 * one, so long archives stay a single row: 1 … 4 5 6 … 12
 */
export const getPageItems = (currentPage: number, totalPages: number): (number | null)[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);
  // Keep the row a stable width at the edges.
  if (currentPage <= 3) [2, 3, 4].forEach((p) => p < totalPages && pages.add(p));
  if (currentPage >= totalPages - 2)
    [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => p > 1 && pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const items: (number | null)[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push(null);
    items.push(page);
  });
  return items;
};

const linkBase =
  "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2";

export function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = getPageItems(currentPage, totalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Blog pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2 border-t border-zinc-200/80 pt-8"
    >
      {hasPrevious ? (
        <Link
          href={buildHref(currentPage - 1)}
          rel="prev"
          aria-label="Previous page"
          className={cn(linkBase, "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Link>
      ) : (
        <span
          aria-hidden
          className={cn(linkBase, "cursor-not-allowed border-zinc-100 bg-white text-[#d4d4d8]")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </span>
      )}

      {items.map((page, index) =>
        page === null ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="inline-flex h-10 w-6 items-end justify-center text-sm text-zinc-400"
          >
            …
          </span>
        ) : page === currentPage ? (
          <span
            key={page}
            aria-current="page"
            className={cn(linkBase, "border-orange-700 bg-orange-700 text-[#fff]")}
          >
            {page}
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            aria-label={`Page ${page}`}
            className={cn(linkBase, "border-zinc-200 bg-white text-zinc-700 hover:border-orange-300 hover:text-orange-700")}
          >
            {page}
          </Link>
        ),
      )}

      {hasNext ? (
        <Link
          href={buildHref(currentPage + 1)}
          rel="next"
          aria-label="Next page"
          className={cn(linkBase, "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50")}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          aria-hidden
          className={cn(linkBase, "cursor-not-allowed border-zinc-100 bg-white text-[#d4d4d8]")}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
