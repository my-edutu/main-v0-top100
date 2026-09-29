import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import * as PostsSectionModule from '@/app/dashboard/posts-section'
import type { MemberPost } from '@/lib/member-posts/types'

const member = {
  id: 'member-1',
  name: 'Amara Okafor',
  headline: 'Climate-tech founder and community builder',
  avatarInitials: 'AO',
  avatarUrl: null,
  publicSlug: 'amara-okafor',
}

const post: MemberPost = {
  id: 'post-1',
  slug: 'resilient-cities',
  title: 'Building for resilient African cities',
  excerpt: 'Three lessons from shipping climate tools with local communities.',
  body: 'Three lessons from shipping climate tools with local communities.',
  coverUrl: 'https://media.example.test/cities.jpg',
  tags: [],
  status: 'published',
  moderationNote: null,
  publishedAt: '2026-08-05T12:00:00.000Z',
  viewCount: 184,
  createdAt: '2026-08-05T12:00:00.000Z',
  updatedAt: '2026-08-05T12:00:00.000Z',
}

describe('member post feed card', () => {
  it('presents a post like an author feed item with real identity, date, content, image and owner actions', () => {
    const PostRow = Reflect.get(PostsSectionModule, 'PostRow') as
      | ComponentType<Record<string, unknown>>
      | undefined

    expect(PostRow).toBeDefined()
    const markup = renderToStaticMarkup(createElement(PostRow as ComponentType<Record<string, unknown>>, {
      post,
      member,
      publicSlug: member.publicSlug,
      onEditHref: '/dashboard/me/posts/post-1/edit',
      onDelete: () => undefined,
      deleting: false,
      mutable: true,
    }))

    expect(markup).toContain('Amara Okafor')
    expect(markup).toContain('Climate-tech founder and community builder')
    expect(markup).toContain('Building for resilient African cities')
    expect(markup).toContain('Three lessons from shipping climate tools with local communities.')
    expect(markup).toContain('src="https://media.example.test/cities.jpg"')
    expect(markup).toContain('184 views')
    expect(markup).toContain('View live')
    expect(markup).toContain('Edit')
    expect(markup).toContain('Delete Building for resilient African cities')
    expect(markup.match(/Published/g)).toHaveLength(1)
  })
})
