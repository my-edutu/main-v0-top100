import { createElement, type ComponentType, type FormEvent } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import * as PostsSectionModule from '@/app/dashboard/posts-section'

type PostEditorProps = {
  editor: { postId: null; title: string; excerpt: string; tags: string; coverUrl: string; body: string }
  onChange: (next: PostEditorProps['editor']) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>, status: 'draft' | 'published') => void
  savingAs: 'draft' | 'published' | null
  canPublish: boolean
  fullScreen?: boolean
  onUploadImage: (file: File) => Promise<string>
}

describe('post composer', () => {
  it('uses a full-page editor with inline image insertion and a single top-bar publish action', () => {
    const PostEditor = Reflect.get(PostsSectionModule, 'PostEditor') as
      | ComponentType<PostEditorProps>
      | undefined

    expect(PostEditor).toBeDefined()
    const markup = renderToStaticMarkup(createElement(PostEditor as ComponentType<PostEditorProps>, {
      editor: { postId: null, title: '', excerpt: '', tags: '', coverUrl: '', body: '' },
      onChange: () => undefined,
      onCancel: () => undefined,
      onSubmit: () => undefined,
      savingAs: null,
      canPublish: true,
      fullScreen: true,
      onUploadImage: async () => 'https://media.example.test/story.webp',
    }))

    expect(markup).toContain('id="member-post-form"')
    expect(markup).not.toContain('role="group" aria-label="Post actions"')
    expect(markup).not.toContain('Amara Okafor')
    expect(markup).not.toContain('Climate-tech founder and community builder')
    expect(markup).toContain('role="toolbar" aria-label="Formatting options"')
    expect(markup).toContain('aria-label="Bold"')
    expect(markup).toContain('aria-label="Italic"')
    expect(markup).toContain('aria-label="Heading"')
    expect(markup).toContain('aria-label="Quote"')
    expect(markup).toContain('aria-label="Bulleted list"')
    expect(markup).toContain('Tell your story…')
    expect(markup).not.toContain('<textarea')
    expect(markup).toContain('Add image')
    expect(markup).toContain('Choose an image for your post')
    expect(markup).not.toContain('Add a photo')
    expect(markup).not.toContain('Save draft')
  })
})
