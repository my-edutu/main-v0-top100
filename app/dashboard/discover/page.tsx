import { DiscoverFeed } from './discover-feed'
import { getPublishedPosts } from '@/lib/posts/server'

export default async function DiscoverPage() {
  const posts = await getPublishedPosts()
  return <DiscoverFeed posts={posts.slice(0, 6).map(({ id, title, slug, excerpt, coverImage }) => ({ id, title, slug, excerpt, coverImage }))} />
}
