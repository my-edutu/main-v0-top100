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

async function loadPosts(slug: string): Promise<MemberPost[]> {
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
    <section className="py-8 border-t border-gray-200">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">Writing</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={memberPostPath(slug, post.slug)}
            className="group block border border-gray-200 p-5 rounded-lg hover:border-orange-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                {post.title}
              </h3>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-orange-500 transition-colors" />
            </div>
            {post.excerpt && (
              <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
                {post.excerpt}
              </p>
            )}
            {post.publishedAt && (
              <time
                dateTime={post.publishedAt}
                className="mt-3 block text-xs text-gray-400 font-medium"
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
