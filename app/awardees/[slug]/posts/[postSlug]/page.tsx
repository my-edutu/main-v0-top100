// app/awardees/[slug]/posts/[postSlug]/page.tsx
// A single member-authored post on its author's public profile.
//
// Rendering note: the body is raw markdown written by a member. It is stored
// verbatim and escaped here, never sanitised on write. This deliberately does
// NOT use the `dangerouslySetInnerHTML` path that app/blog/[slug]/page.tsx
// uses — that content is admin-authored HTML, this is not. Paragraphs are
// split and rendered as text nodes, exactly as the awardee profile page
// already renders a member's bio, so React escapes everything and no new
// markdown or HTML-sanitiser dependency is introduced.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, Clock } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/server'
import { ogMetadata } from '@/lib/og'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import {
  bumpViewCount,
  loadPublishedPost,
  mapMemberPost,
  resolveAwardeeBySlug,
} from '@/lib/member-posts/server'
import { memberPostPath, readingMinutes, type MemberPost } from '@/lib/member-posts/types'

export const runtime = 'nodejs'
export const revalidate = 300

type PageParams = { slug: string; postSlug: string }

/**
 * Resolve the awardee, then their published post. Returns null for every
 * failure mode — unknown awardee, directory entry with no member account,
 * unpublished post, and the member_posts table not existing at all (the
 * migration may not have been run yet, and a public page must never 500 for
 * that). The caller turns null into notFound().
 */
async function loadPost(
  params: PageParams,
): Promise<{ post: MemberPost; authorName: string } | null> {
  const awardee = await resolveAwardeeBySlug(params.slug)
  if (!awardee?.profileId) return null

  try {
    const supabase = createAdminClient()
    const { row, error } = await loadPublishedPost(supabase, awardee.profileId, params.postSlug)
    if (error || !row) return null
    return { post: mapMemberPost(row), authorName: awardee.name }
  } catch (error) {
    console.error('[member-posts] Could not load public post:', error)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const resolved = await params
  const found = await loadPost(resolved)

  if (!found) {
    return {
      title: 'Post not found',
      description: 'The requested post could not be located.',
      robots: { index: false },
    }
  }

  const { post, authorName } = found
  const description =
    post.excerpt || `${authorName} writes about ${post.title} on Top100 Africa Future Leaders.`
  const canonical = memberPostPath(resolved.slug, post.slug)
  return {
    title: `${post.title} — ${authorName}`,
    description,
    keywords: [...post.tags, authorName, SITE_NAME],
    authors: [{ name: authorName }],
    alternates: { canonical },
    ...ogMetadata(
      { title: post.title, eyebrow: authorName, subtitle: post.excerpt ?? undefined, hero: post.coverUrl },
      {
        url: canonical,
        type: 'article',
        description: description.slice(0, 200),
        article: {
          publishedTime: post.publishedAt ?? undefined,
          modifiedTime: post.updatedAt,
          authors: [authorName],
          tags: post.tags,
        },
      },
    ),
  }
}

export default async function MemberPostPage({ params }: { params: Promise<PageParams> }) {
  const resolved = await params
  const found = await loadPost(resolved)

  if (!found) {
    notFound()
  }

  const { post, authorName } = found

  // Best-effort: a failed counter must never break the page, so it is not
  // awaited into the render path and swallows its own errors.
  try {
    const supabase = createAdminClient()
    await bumpViewCount(supabase, post.id, post.viewCount)
  } catch (error) {
    console.error('[member-posts] Could not increment view_count:', error)
  }

  const paragraphs = post.body.split(/\n\n+/).map((entry) => entry.trim()).filter(Boolean)

  return (
    <div className="min-h-screen bg-white py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <Link
          href={`/awardees/${resolved.slug}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-orange-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {authorName}
        </Link>

        <article className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white">
          <div className="p-8 md:p-10 pb-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
              {authorName}
            </p>
            <h1 className="mt-3 mb-3 text-balance text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
              {post.publishedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {readingMinutes(post.body)} min read
              </span>
            </div>
          </div>

          {post.coverUrl && (
            <div className="relative h-72 w-full overflow-hidden md:h-96">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverUrl}
                alt={post.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="space-y-6 p-8 md:p-10">
            {post.excerpt && (
              <p className="text-lg font-medium leading-relaxed text-zinc-600">{post.excerpt}</p>
            )}

            {/* Text nodes, not HTML — see the file header. */}
            <div className="space-y-5">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="whitespace-pre-wrap text-lg leading-relaxed text-zinc-700"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
