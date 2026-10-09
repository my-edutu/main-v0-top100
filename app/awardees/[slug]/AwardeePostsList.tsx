// app/awardees/[slug]/AwardeePostsList.tsx
// The awardee's own published posts, listed on their public profile.
//
// Renders nothing at all when there are none — a public profile should never
// show an empty state for a feature the visitor did not ask about — and
// nothing when the member_posts migration has not been run, so adding this to
// the profile page cannot break it for every visitor.
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/server'
import {
  loadPublishedPostsForAuthor,
  mapMemberPost,
  resolveAwardeeBySlug,
} from '@/lib/member-posts/server'
import { memberPostPath, type MemberPost } from '@/lib/member-posts/types'
import { DEMO_PUBLIC_SLUG, getDemoDashboardStore } from '@/lib/dev-dashboard/store'

async function loadPosts(slug: string): Promise<MemberPost[]> {
  // The local preview uses an in-memory member store instead of Supabase. Keep
  // the public profile and its blog links in sync with the member dashboard in
  // that environment as well.
  if (process.env.NODE_ENV !== 'production' && slug === DEMO_PUBLIC_SLUG) {
    return getDemoDashboardStore().posts.filter((post) => post.status === 'published')
  }

  try {
    const awardee = await resolveAwardeeBySlug(slug)
    if (!awardee?.profileId) return []

    const supabase = createAdminClient()
    const { rows, error } = await loadPublishedPostsForAuthor(supabase, awardee.profileId)
    if (error) {
      // Includes the "table does not exist" case. Fail soft: no section.
      console.error('[member-posts] Could not load posts for public profile:', error)
      return []
    }
    return rows.map(mapMemberPost)
  } catch (error) {
    console.error('[member-posts] Could not load posts for public profile:', error)
    return []
  }
}

export default async function AwardeePostsList({ slug }: { slug: string }) {
  const posts = await loadPosts(slug)

  if (posts.length === 0) return null

  return (
    <section className="max-w-3xl border-t border-stone-200 py-8">
      <h2 className="mb-5 text-xl font-semibold tracking-tight text-[#171412]">Writing</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={memberPostPath(slug, post.slug)}
            className="group block rounded-xl border border-stone-200 p-5 transition-colors hover:border-[#E9A879] hover:bg-[#FFFCF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 font-semibold text-[#25211D] transition-colors group-hover:text-[#A94412]">
                {post.title}
              </h3>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-stone-500 transition-colors group-hover:text-[#A94412]" aria-hidden="true" />
            </div>
            {post.excerpt && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-stone-600">
                {post.excerpt}
              </p>
            )}
            {post.publishedAt && (
              <time
                dateTime={post.publishedAt}
                className="mt-3 block text-xs text-stone-500"
              >
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
