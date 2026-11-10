import Link from 'next/link'
import { LockKeyhole, Users } from 'lucide-react'
import { memberMentorshipOpen, MEMBER_MENTORS } from '@/lib/mentors/contracts'
import { DiscoverFeed } from './discover-feed'
import { getPublishedPosts } from '@/lib/posts/server'

export default async function DiscoverPage() {
  const posts = await getPublishedPosts()
  const open = memberMentorshipOpen()
  const Icon = open ? Users : LockKeyhole
  return <>
    <DiscoverFeed posts={posts.slice(0, 6).map(({ id, title, slug, excerpt, coverImage }) => ({ id, title, slug, excerpt, coverImage }))} />
    <Link href={MEMBER_MENTORS} className="mt-5 flex min-h-14 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-950 hover:bg-stone-50">
      <Icon size={20} className="shrink-0" aria-hidden="true" />
      <span><strong className="block text-sm">Impact Africa mentors</strong><span className="text-sm text-stone-600">{open ? 'Find a mentor or check your matches' : 'Mentor matching is closed for now'}</span></span>
    </Link>
  </>
}
