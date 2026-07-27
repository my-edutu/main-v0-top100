'use client'

// app/dashboard/posts-section.tsx
// The member's own posts: write, save a draft, publish, update, delete, and
// jump to the live public URL. Self-contained — it fetches everything it needs
// from /api/member/posts itself.
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, PenSquare, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { MemberProfile } from '@/lib/member-hub'
import {
  MemberPostsSetupRequiredError,
  createPost,
  deletePost,
  fetchMyPosts,
  updatePost,
} from '@/lib/member-posts/client'
import {
  BODY_MAX,
  BODY_MIN,
  EXCERPT_MAX,
  TAGS_MAX,
  TAG_MAX_LENGTH,
  TITLE_MAX,
  memberPostPath,
  type MemberPost,
  type MemberPostStatus,
} from '@/lib/member-posts/types'

const STATUS_CHIP: Record<MemberPostStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  published: { label: 'Published', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  flagged: { label: 'Flagged', className: 'bg-red-50 text-red-700 border-red-200' },
  removed: { label: 'Removed', className: 'bg-black/5 text-black/50 border-black/10' },
}

type EditorState = {
  postId: string | null
  title: string
  excerpt: string
  tags: string
  coverUrl: string
  body: string
}

const EMPTY_EDITOR: EditorState = {
  postId: null,
  title: '',
  excerpt: '',
  tags: '',
  coverUrl: '',
  body: '',
}

function editorFor(post: MemberPost): EditorState {
  return {
    postId: post.id,
    title: post.title,
    excerpt: post.excerpt ?? '',
    tags: post.tags.join(', '),
    coverUrl: post.coverUrl ?? '',
    body: post.body,
  }
}

/** "one, two , three" -> ['one', 'two', 'three'] */
function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, TAGS_MAX)
    .map((tag) => tag.slice(0, TAG_MAX_LENGTH))
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PostsSection({ member }: { member: MemberProfile }) {
  const [posts, setPosts] = useState<MemberPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [setupMessage, setSetupMessage] = useState('')
  const [editor, setEditor] = useState<EditorState | null>(null)
  // Which action is in flight, so the right button shows the spinner.
  const [savingAs, setSavingAs] = useState<'draft' | 'published' | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setSetupMessage('')
    try {
      setPosts(await fetchMyPosts())
    } catch (error) {
      if (error instanceof MemberPostsSetupRequiredError) {
        setSetupMessage(error.message)
      } else {
        setLoadError(error instanceof Error ? error.message : 'Could not load your posts.')
      }
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const canPublish = member.status === 'approved'

  async function handleSubmit(event: FormEvent<HTMLFormElement>, status: 'draft' | 'published') {
    event.preventDefault()
    if (!editor) return

    const payload = {
      title: editor.title.trim(),
      body: editor.body.trim(),
      excerpt: editor.excerpt.trim(),
      coverUrl: editor.coverUrl.trim(),
      tags: parseTags(editor.tags),
      status,
    }

    try {
      setSavingAs(status)
      if (editor.postId) {
        await updatePost(editor.postId, payload)
        toast.success(status === 'published' ? 'Post published.' : 'Draft saved.')
      } else {
        await createPost(payload)
        toast.success(status === 'published' ? 'Post published.' : 'Draft saved.')
      }
      setEditor(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your post.')
    } finally {
      setSavingAs(null)
    }
  }

  async function handleDelete(post: MemberPost) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    try {
      setDeletingId(post.id)
      await deletePost(post.id)
      toast.success('Post deleted.')
      if (editor?.postId === post.id) setEditor(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this post.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[240px] place-items-center rounded-[28px] border border-orange-100 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-block h-7 w-7 animate-spin rounded-full border-b-2 border-t-2 border-orange-500" />
          <p className="text-sm font-semibold text-black/60">Loading your posts...</p>
        </div>
      </div>
    )
  }

  if (setupMessage) {
    return (
      <div role="status" className="rounded-[28px] border border-amber-200 bg-amber-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Not set up yet</p>
        <p className="mt-2 text-sm font-medium leading-6 text-amber-900">{setupMessage}</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-[28px] border border-orange-100 bg-white p-6">
        <p className="text-sm font-semibold text-orange-700">{loadError}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          className="mt-4 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-orange-100 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-[#fffaf0]">
              <PenSquare className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Your writing</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-black">Posts</h3>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
                Write in your own words. Published posts appear on your public profile straight away —
                our team reviews them afterwards.
              </p>
            </div>
          </div>

          {!editor && (
            <Button
              type="button"
              onClick={() => setEditor(EMPTY_EDITOR)}
              className="rounded-full bg-orange-500 px-6 py-6 text-[#fffaf0] hover:bg-orange-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Write a post
            </Button>
          )}
        </div>
      </section>

      {!canPublish && (
        <div role="status" className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium leading-6 text-amber-900">
            Your membership is still being reviewed. You can save drafts now and publish them once
            you are approved.
          </p>
        </div>
      )}

      {editor && (
        <PostEditor
          editor={editor}
          onChange={setEditor}
          onCancel={() => setEditor(null)}
          onSubmit={handleSubmit}
          savingAs={savingAs}
          canPublish={canPublish}
        />
      )}

      {posts.length === 0 && !editor ? (
        <div className="rounded-[28px] border border-dashed border-orange-200 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-black">You have not written anything yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-black/55">
            Share what you are building, what you have learned, or the story behind your work.
          </p>
          <Button
            type="button"
            onClick={() => setEditor(EMPTY_EDITOR)}
            className="mt-5 rounded-full bg-orange-500 px-6 py-6 text-[#fffaf0] hover:bg-orange-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Write your first post
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              publicSlug={member.publicSlug}
              onEdit={() => setEditor(editorFor(post))}
              onDelete={() => void handleDelete(post)}
              deleting={deletingId === post.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PostRow({
  post,
  publicSlug,
  onEdit,
  onDelete,
  deleting,
}: {
  post: MemberPost
  publicSlug?: string
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const chip = STATUS_CHIP[post.status]
  const removed = post.status === 'removed'
  const liveUrl =
    post.status === 'published' && publicSlug ? memberPostPath(publicSlug, post.slug) : null

  return (
    <article className="rounded-[24px] border border-orange-100 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xl font-bold tracking-tight text-black">{post.title}</h4>
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${chip.className}`}
            >
              {chip.label}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-black/45">
            {post.publishedAt
              ? `Published ${formatDate(post.publishedAt)}`
              : `Created ${formatDate(post.createdAt)}`}
            {post.status === 'published' ? ` · ${post.viewCount} view${post.viewCount === 1 ? '' : 's'}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 underline underline-offset-4"
            >
              View live
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {!removed && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onEdit}
                className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onDelete}
                disabled={deleting}
                aria-label={`Delete ${post.title}`}
                className="rounded-full border-red-200 bg-white text-red-700 hover:bg-red-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {post.excerpt && (
        <p className="mt-3 text-sm font-medium leading-6 text-black/60">{post.excerpt}</p>
      )}

      {(post.status === 'flagged' || post.status === 'removed') && (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 ${
            post.status === 'flagged'
              ? 'border-red-200 bg-red-50'
              : 'border-black/10 bg-black/[0.03]'
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.14em] ${
              post.status === 'flagged' ? 'text-red-700' : 'text-black/50'
            }`}
          >
            {post.status === 'flagged' ? 'Hidden pending changes' : 'Removed by the admin team'}
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-black/65">
            {post.moderationNote ||
              (post.status === 'flagged'
                ? 'Our team asked for a change before this goes back up.'
                : 'This post is no longer public and cannot be edited or re-published.')}
          </p>
        </div>
      )}
    </article>
  )
}

function PostEditor({
  editor,
  onChange,
  onCancel,
  onSubmit,
  savingAs,
  canPublish,
}: {
  editor: EditorState
  onChange: (next: EditorState) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>, status: 'draft' | 'published') => void
  savingAs: 'draft' | 'published' | null
  canPublish: boolean
}) {
  // Which button was pressed, read by the single form onSubmit below so both
  // actions share one validation pass and one submit path. A ref, not state:
  // the click and the submit are batched into the same render, so a state
  // update here would still read as its previous value inside onSubmit.
  const intentRef = useRef<'draft' | 'published'>('draft')
  const saving = savingAs !== null
  const bodyLength = editor.body.trim().length
  const bodyTooShort = bodyLength > 0 && bodyLength < BODY_MIN
  const bodyTooLong = bodyLength > BODY_MAX

  return (
    <form
      onSubmit={(event) => onSubmit(event, intentRef.current)}
      className="rounded-[28px] border border-orange-100 bg-white p-5 sm:p-6"
    >
      <h4 className="text-2xl font-bold tracking-tight text-black">
        {editor.postId ? 'Edit post' : 'Write a post'}
      </h4>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="post-title" className="font-semibold text-black">
            Title
          </Label>
          <Input
            id="post-title"
            required
            maxLength={TITLE_MAX}
            value={editor.title}
            onChange={(event) => onChange({ ...editor, title: event.target.value })}
            placeholder="What is this post about?"
            className="h-14 rounded-2xl border-orange-100 text-base text-black placeholder:text-black/40"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-excerpt" className="font-semibold text-black">
            Excerpt (optional)
          </Label>
          <Input
            id="post-excerpt"
            maxLength={EXCERPT_MAX}
            value={editor.excerpt}
            onChange={(event) => onChange({ ...editor, excerpt: event.target.value })}
            placeholder="One or two lines shown on your profile"
            className="h-14 rounded-2xl border-orange-100 text-base text-black placeholder:text-black/40"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="post-tags" className="font-semibold text-black">
              Tags (optional, comma separated)
            </Label>
            <Input
              id="post-tags"
              value={editor.tags}
              onChange={(event) => onChange({ ...editor, tags: event.target.value })}
              placeholder="climate, founders, lagos"
              className="h-14 rounded-2xl border-orange-100 text-base text-black placeholder:text-black/40"
            />
            <p className="text-xs font-medium text-black/45">
              Up to {TAGS_MAX} tags, {TAG_MAX_LENGTH} characters each.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-cover" className="font-semibold text-black">
              Cover image URL (optional)
            </Label>
            <Input
              id="post-cover"
              type="url"
              value={editor.coverUrl}
              onChange={(event) => onChange({ ...editor, coverUrl: event.target.value })}
              placeholder="https://..."
              className="h-14 rounded-2xl border-orange-100 text-base text-black placeholder:text-black/40"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-body" className="font-semibold text-black">
            Your post
          </Label>
          <Textarea
            id="post-body"
            required
            rows={14}
            value={editor.body}
            onChange={(event) => onChange({ ...editor, body: event.target.value })}
            placeholder="Write in markdown. Leave a blank line between paragraphs."
            className="rounded-2xl border-orange-100 text-base text-black placeholder:text-black/40"
          />
          <p
            className={`text-xs font-medium ${
              bodyTooShort || bodyTooLong ? 'text-red-600' : 'text-black/45'
            }`}
          >
            {bodyLength.toLocaleString()} / {BODY_MAX.toLocaleString()} characters
            {bodyTooShort ? ` — at least ${BODY_MIN} needed` : ''}
            {bodyTooLong ? ' — too long' : ''}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          onClick={() => {
            intentRef.current = 'draft'
          }}
          disabled={saving}
          variant="outline"
          className="rounded-full border-orange-200 bg-white px-6 py-6 text-black hover:bg-orange-50"
        >
          {savingAs === 'draft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save draft
        </Button>

        <Button
          type="submit"
          onClick={() => {
            intentRef.current = 'published'
          }}
          disabled={saving || !canPublish || bodyTooShort || bodyTooLong}
          className="rounded-full bg-orange-500 px-8 py-6 text-[#fffaf0] hover:bg-orange-600 disabled:bg-orange-200 disabled:text-black/45"
        >
          {savingAs === 'published' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : editor.postId ? (
            'Update & publish'
          ) : (
            'Publish'
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full text-black/60 hover:bg-orange-50 hover:text-black"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
