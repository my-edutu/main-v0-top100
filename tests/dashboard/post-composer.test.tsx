import { createElement, type ComponentType, type FormEvent } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import * as PostsSectionModule from '@/app/dashboard/posts-section'
import type { MemberProfile } from '@/lib/member-hub'

type PostEditorProps = {
  editor: { postId: null; title: string; excerpt: string; tags: string; coverUrl: string; body: string }
  member: MemberProfile
  onChange: (next: PostEditorProps['editor']) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>, status: 'draft' | 'published') => void
  savingAs: 'draft' | 'published' | null
  canPublish: boolean
}

const member: MemberProfile = {
  id: 'member-1', name: 'Amara Okafor', email: 'amara@example.test', inviteCode: 'AMARA',
  status: 'approved', profileStatus: 'approved', headline: 'Climate-tech founder and community builder',
  bio: '', location: 'Lagos, Nigeria', organization: '', field: 'Climate', avatarInitials: 'AO',
  recruiterVisible: true, emailVisible: false, showInDirectory: true, allowDirectMessages: true,
  opportunityAlerts: true, magazineAlerts: true, messageAlerts: true, eventReminders: true,
  hideEmailFromRecruiters: true, requireProfileApproval: false, securityEmails: true,
  bioUpdateCount: 0, bioUpdateLimit: 3, createdAt: '2026-01-01T00:00:00.000Z',
}

describe('post composer', () => {
  it('uses a focused formatting toolbar while keeping photo and publishing actions available', () => {
    const PostEditor = Reflect.get(PostsSectionModule, 'PostEditor') as
      | ComponentType<PostEditorProps>
      | undefined

    expect(PostEditor).toBeDefined()
    const markup = renderToStaticMarkup(createElement(PostEditor as ComponentType<PostEditorProps>, {
      editor: { postId: null, title: '', excerpt: '', tags: '', coverUrl: '', body: '' },
      member,
      onChange: () => undefined,
      onCancel: () => undefined,
      onSubmit: () => undefined,
      savingAs: null,
      canPublish: true,
    }))

    expect(markup).toContain('role="group" aria-label="Post actions"')
    expect(markup).toContain('Amara Okafor')
    expect(markup).toContain('role="toolbar" aria-label="Formatting options"')
    expect(markup).toContain('aria-label="Bold"')
    expect(markup).toContain('aria-label="Italic"')
    expect(markup).toContain('aria-label="Heading"')
    expect(markup).toContain('aria-label="Quote"')
    expect(markup).toContain('aria-label="Bulleted list"')
    expect(markup).toContain('Tell your story…')
    expect(markup).not.toContain('<textarea')
    expect(markup).toContain('Add a photo')
    expect(markup).toContain('Save draft')
    expect(markup).toContain('>Post</button>')
  })
})
