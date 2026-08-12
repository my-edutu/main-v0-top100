import { describe, expect, it } from 'vitest'

import {
  postMembershipCapabilities,
  resolvePostEditorState,
} from '@/app/dashboard/posts-section'
import type { MemberPost } from '@/lib/member-posts/types'

const post: MemberPost = {
  id: 'post-7',
  slug: 'routed-writing',
  title: 'Routed writing',
  excerpt: 'A durable editor route',
  body: 'This post has enough text to be edited.',
  coverUrl: null,
  tags: ['routes'],
  status: 'draft',
  moderationNote: null,
  publishedAt: null,
  viewCount: 0,
  createdAt: '2026-08-11T12:00:00.000Z',
  updatedAt: '2026-08-11T12:00:00.000Z',
}

describe('routed post editor state', () => {
  it('opens the requested owned post as soon as an edit-route load resolves', () => {
    expect(resolvePostEditorState('edit', 'post-7', [post])).toEqual({
      kind: 'editor',
      editor: {
        postId: 'post-7',
        title: 'Routed writing',
        excerpt: 'A durable editor route',
        tags: 'routes',
        coverUrl: '',
        body: 'This post has enough text to be edited.',
      },
    })
  })

  it('does not open a different post for an unknown edit-route id', () => {
    expect(resolvePostEditorState('edit', 'missing', [post])).toEqual({ kind: 'missing' })
  })

  it('resolves a removed post edit route to an explanatory unavailable state', () => {
    expect(
      resolvePostEditorState('edit', 'post-7', [{ ...post, status: 'removed' }]),
    ).toEqual({
      kind: 'unavailable',
      message: 'This post was removed by the admin team.',
    })
  })

  it('keeps pending drafts writable while disabling all writing for restricted accounts', () => {
    expect(postMembershipCapabilities('approved')).toEqual({ canWrite: true, canPublish: true })
    expect(postMembershipCapabilities('pending')).toEqual({ canWrite: true, canPublish: false })
    expect(postMembershipCapabilities('suspended')).toEqual({ canWrite: false, canPublish: false })
    expect(postMembershipCapabilities('rejected')).toEqual({ canWrite: false, canPublish: false })
  })
})
