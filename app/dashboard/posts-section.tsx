'use client'

// app/dashboard/posts-section.tsx
// The member's own posts: write, publish, update, delete, and
// jump to the live public URL. Self-contained — it fetches everything it needs
// from /api/member/posts itself.
import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, ImagePlus, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import dynamic from 'next/dynamic'
import { DashboardLoading } from './_components/dashboard-loading'

const MediumPostEditor = dynamic(() => import('@/components/editor/medium-post-editor').then(module => module.MediumPostEditor), {
  loading: () => <DashboardLoading label="Opening your editor" />,
})
import type { MemberProfile } from '@/lib/member-hub'
import { MemberAvatar } from '@/app/dashboard/_components/member-avatar'
import { renderMemberPostBody } from '@/lib/member-posts/content'
import {
  MemberPostsSetupRequiredError,
  createPost,
  deletePost,
  fetchMyPosts,
  updatePost,
  uploadMemberPostCover,
} from '@/lib/member-posts/client'
import {
  BODY_MAX,
  BODY_MIN,
  TITLE_MAX,
  REMOVED_POST_MESSAGE,
  deriveMemberPostTitle,
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

export type PostsSectionMode = 'list' | 'new' | 'edit'

type EditorState = {
  postId: string | null
  title: string
  excerpt: string
  tags: string
  coverUrl: string
  body: string
}

type PostEditorRouteState =
  | { kind: 'editor'; editor: EditorState }
  | { kind: 'missing' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'list' }

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

export function resolvePostEditorState(
  mode: PostsSectionMode,
  postId: string | undefined,
  posts: MemberPost[],
): PostEditorRouteState {
  if (mode === 'new') return { kind: 'editor', editor: EMPTY_EDITOR }
  if (mode === 'edit') {
    const post = posts.find((candidate) => candidate.id === postId)
    if (!post) return { kind: 'missing' }
    if (post.status === 'removed') {
      return { kind: 'unavailable', message: REMOVED_POST_MESSAGE }
    }
    return { kind: 'editor', editor: editorFor(post) }
  }
  return { kind: 'list' }
}

export function postMembershipCapabilities(status: MemberProfile['status']) {
  const canWrite = status === 'approved' || status === 'pending'
  return { canWrite, canPublish: status === 'approved' }
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

type PostsSectionProps = {
  member: MemberProfile
  mode?: PostsSectionMode
  postId?: string
  onEditorExit?: () => void
}

export default function PostsSection({
  member,
  mode = 'list',
  postId,
  onEditorExit,
}: PostsSectionProps) {
  const [posts, setPosts] = useState<MemberPost[]>([])
  const [loading, setLoading] = useState(mode !== 'new')
  const [loadError, setLoadError] = useState('')
  const [setupMessage, setSetupMessage] = useState('')
  const [routeState, setRouteState] = useState<PostEditorRouteState>(() =>
    resolvePostEditorState(mode, postId, []),
  )
  const editor = routeState.kind === 'editor' ? routeState.editor : null
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
    if (mode !== 'new') void load()
  }, [load, mode])

  useEffect(() => {
    if (loading) return
    setRouteState(resolvePostEditorState(mode, postId, posts))
  }, [loading, mode, postId, posts])

  const { canPublish, canWrite } = postMembershipCapabilities(member.status)
  const accountRestricted = !canWrite

  function exitEditor() {
    setRouteState({ kind: 'list' })
    onEditorExit?.()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, status: 'draft' | 'published') {
    event.preventDefault()
    if (!editor || savingAs) return

    const payload = {
      title: editor.postId ? editor.title.trim() : deriveMemberPostTitle(editor.body.trim()),
      body: editor.body.trim(),
      coverUrl: editor.coverUrl.trim(),
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
      await load()
      exitEditor()
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
      if (editor?.postId === post.id) exitEditor()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this post.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && posts.length === 0) return <DashboardLoading label="Loading your posts" />

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

  if (
    mode === 'edit' &&
    (routeState.kind === 'missing' || routeState.kind === 'unavailable') &&
    !accountRestricted
  ) {
    return (
      <div role="alert" className="rounded-[24px] border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-bold text-amber-900">
          {routeState.kind === 'unavailable'
            ? routeState.message
            : 'We could not find that post in your account.'}
        </p>
        <Button asChild variant="outline" className="mt-4 rounded-full border-amber-300 bg-white text-black hover:bg-white">
          <Link href="/dashboard/me/posts">Back to posts</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className={mode === 'new' ? 'min-h-[calc(100dvh-60px)]' : 'space-y-5'}>
      {mode === 'list' && !accountRestricted && posts.length > 0 && (
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Your posts</h2>
            <p className="mt-0.5 text-sm text-neutral-500">Updates and stories you have shared.</p>
          </div>
          <Button asChild className="min-h-10 rounded-full bg-orange-600 px-4 text-white shadow-none hover:bg-orange-700">
            <Link href="/dashboard/me/posts/new"><Plus className="mr-2 h-4 w-4" />Start writing</Link>
          </Button>
        </div>
      )}

      {member.status === 'pending' && (
        <div role="status" className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium leading-6 text-amber-900">
            Your membership is still being reviewed. You can save drafts now and publish them once
            you are approved.
          </p>
        </div>
      )}

      {accountRestricted && (
        <div role="status" className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-sm font-semibold leading-6 text-rose-900">
            {member.status === 'suspended'
              ? 'Writing and publishing are paused while your membership is suspended. Contact the AFL team to restore access.'
              : 'Writing and publishing are unavailable because your membership application was not approved. Contact the AFL team if this looks wrong.'}
          </p>
        </div>
      )}

      {editor && !accountRestricted && (
        <PostEditor
          editor={editor}
          onChange={(nextEditor) => setRouteState({ kind: 'editor', editor: nextEditor })}
          onCancel={exitEditor}
          onSubmit={handleSubmit}
          savingAs={savingAs}
          canPublish={canPublish}
          fullScreen={mode === 'new'}
          onUploadImage={uploadMemberPostCover}
        />
      )}

      {mode === 'list' && posts.length === 0 && !accountRestricted ? (
        <div className="rounded-[28px] border border-dashed border-orange-200 bg-white/60 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-black">You have not written anything yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-black/55">
            Share what you are building, what you have learned, or the story behind your work.
          </p>
          <Button asChild
            className="mt-5 rounded-full bg-orange-600 px-6 py-6 text-white shadow-none hover:bg-orange-700"
          >
            <Link href="/dashboard/me/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              Start writing
            </Link>
          </Button>
        </div>
      ) : mode === 'list' ? (
        <div aria-label="Your posts" className="mx-auto w-full max-w-3xl space-y-4">
          {posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              member={member}
              publicSlug={member.publicSlug}
              onEditHref={`/dashboard/me/posts/${encodeURIComponent(post.id)}/edit`}
              onDelete={() => void handleDelete(post)}
              deleting={deletingId === post.id}
              mutable={canWrite}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function PostRow({
  post,
  member,
  publicSlug,
  onEditHref,
  onDelete,
  deleting,
  mutable,
}: {
  post: MemberPost
  member: Pick<MemberProfile, 'name' | 'headline' | 'avatarInitials' | 'avatarUrl'>
  publicSlug?: string
  onEditHref: string
  onDelete: () => void
  deleting: boolean
  mutable: boolean
}) {
  const chip = STATUS_CHIP[post.status]
  const removed = post.status === 'removed'
  const liveUrl =
    post.status === 'published' && publicSlug ? memberPostPath(publicSlug, post.slug) : null
  const postDate = post.publishedAt || post.createdAt

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <MemberAvatar src={member.avatarUrl} initials={member.avatarInitials} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-[15px] font-semibold leading-5 text-neutral-900">{member.name}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chip.className}`}>
              {chip.label}
            </span>
          </div>
          {member.headline && <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-neutral-600">{member.headline}</p>}
          <p className="mt-1 text-xs text-neutral-500">
            <time dateTime={postDate}>{formatDate(postDate)}</time>
            {post.status === 'published' && <span aria-hidden="true"> · </span>}
            {post.status === 'published' && <span>{post.viewCount} view{post.viewCount === 1 ? '' : 's'}</span>}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <h3 className="text-lg font-semibold leading-6 tracking-tight text-neutral-900">{post.title}</h3>
        <div
          className="post-feed-body mt-2 text-[15px] leading-6 text-neutral-700 [&_a]:text-orange-700 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-orange-300 [&_blockquote]:pl-3 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: renderMemberPostBody(post.excerpt || post.body) }}
        />
      </div>

      {post.coverUrl && (
        <img
          src={post.coverUrl}
          alt={`Cover image for ${post.title}`}
          loading="lazy"
          className="max-h-[32rem] w-full border-y border-neutral-100 bg-neutral-50 object-cover"
        />
      )}

      {(liveUrl || (!removed && mutable)) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 px-4 py-3 sm:px-5">
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              View live
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
          {!removed && mutable && (
            <>
              <Button asChild variant="ghost"
              className="min-h-10 rounded-lg px-3 text-sm font-semibold text-neutral-700 shadow-none hover:bg-neutral-100 hover:text-neutral-900"
              >
                <Link href={onEditHref}>Edit</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={deleting}
                aria-label={`Delete ${post.title}`}
                className="ml-auto h-10 w-10 rounded-lg p-0 text-neutral-500 shadow-none hover:bg-red-50 hover:text-red-700"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>
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

export function PostEditor({
  editor,
  onChange,
  onCancel,
  onSubmit,
  savingAs,
  canPublish,
  fullScreen = false,
  onUploadImage,
}: {
  editor: EditorState
  onChange: (next: EditorState) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>, status: 'draft' | 'published') => void
  savingAs: 'draft' | 'published' | null
  canPublish: boolean
  fullScreen?: boolean
  onUploadImage: (file: File) => Promise<string>
}) {
  const saving = savingAs !== null
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false)
  const bodyLength = editor.body.trim().length
  const bodyTooShort = bodyLength < BODY_MIN
  const bodyTooLong = bodyLength > BODY_MAX
  function submitPost(event: FormEvent<HTMLFormElement>) {
    if (event.currentTarget.dataset.uploadingImage === 'true') {
      event.preventDefault()
      toast.error('Wait for the image to finish uploading before posting.')
      return
    }
    if (bodyTooShort || bodyTooLong) {
      event.preventDefault()
      toast.error(bodyTooLong ? 'Your post is too long.' : `Write at least ${BODY_MIN} characters before posting.`)
      return
    }
    onSubmit(event, canPublish ? 'published' : 'draft')
  }

  return (
    <form id={fullScreen ? 'member-post-form' : undefined} data-uploading-image={uploadingInlineImage} onSubmit={submitPost} className={fullScreen ? 'flex min-h-[calc(100dvh-60px)] w-full flex-col' : 'mx-auto w-full max-w-3xl'}>
      <h4 className="sr-only">{editor.postId ? 'Edit post' : 'Create a post'}</h4>

      <div className={`bg-white ${fullScreen ? 'flex min-h-[calc(100dvh-60px)] flex-1 flex-col' : ''}`}>
        {editor.postId ? <details className="mb-4 mt-3 rounded-lg border border-neutral-200 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-neutral-600">Edit post title</summary>
          <Label htmlFor="post-title" className="sr-only">Post title</Label>
          <Input
            id="post-title"
            required
            maxLength={TITLE_MAX}
            value={editor.title}
            onChange={(event) => onChange({ ...editor, title: event.target.value })}
            className="mt-2 min-h-11 border-neutral-200 text-sm text-[#171717]"
          />
        </details> : null}

        <MediumPostEditor
          value={editor.body}
          onChange={(body) => onChange({ ...editor, body })}
          onUploadImage={onUploadImage}
          onUploadingChange={setUploadingInlineImage}
          fullScreen={fullScreen}
        />

        {!fullScreen && <div className="mt-4">
          {editor.coverUrl ? <div className="relative overflow-hidden rounded-lg border border-black/10">
            <img src={editor.coverUrl} alt="Photo attached to your post" className="max-h-96 w-full object-cover" />
            <button type="button" aria-label="Remove attached photo" onClick={() => onChange({ ...editor, coverUrl: '' })} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white text-neutral-800 shadow-sm hover:bg-neutral-100">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div> : null}
          <Input
            id="post-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploadingCover || saving}
            aria-label="Add a cover photo to your post"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              try {
                setUploadingCover(true)
                const url = await uploadMemberPostCover(file)
                onChange({ ...editor, coverUrl: url })
              } catch (cause) {
                toast.error(cause instanceof Error ? cause.message : 'Could not upload the photo.')
              } finally {
                setUploadingCover(false)
                event.target.value = ''
              }
            }}
            className="peer sr-only"
            style={{ width: 1, height: 1 }}
          />
          <label htmlFor="post-cover" className={`mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-orange-700 ${uploadingCover ? 'pointer-events-none opacity-60' : ''}`}>
            {uploadingCover ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
            {uploadingCover ? 'Adding photo…' : editor.coverUrl ? 'Change cover photo' : 'Add a cover photo'}
          </label>
        </div>}

        <div className="flex items-center justify-between gap-3 py-3">
          <p className={`text-xs ${bodyTooShort || bodyTooLong ? 'text-red-700' : 'text-neutral-500'}`}>
            {bodyLength.toLocaleString()} / {BODY_MAX.toLocaleString()}{bodyTooShort ? ` · ${BODY_MIN} characters minimum` : ''}{bodyTooLong ? ' · too long' : ''}
          </p>
          {!fullScreen && <p className="hidden text-xs text-neutral-500 sm:block">Published posts appear on your awardee profile.</p>}
        </div>

        {!fullScreen && <div role="group" aria-label="Post actions" className="flex flex-col items-stretch gap-2 border-t border-neutral-200 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
        <Button
          type="submit"
          disabled={saving || bodyTooShort || bodyTooLong}
          className="min-h-11 rounded-[10px] bg-orange-600 px-5 text-sm text-white shadow-none hover:bg-orange-700 disabled:bg-orange-200 disabled:text-neutral-700"
        >
          {savingAs === 'published' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : savingAs === 'draft' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : editor.postId ? (
            canPublish ? 'Update & publish' : 'Save'
          ) : (
            canPublish ? 'Post' : 'Save'
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          className="min-h-11 rounded-full text-neutral-600 hover:bg-orange-50 hover:text-[#171717]"
        >
          Cancel
        </Button>
          </div>
        </div>}
      </div>
    </form>
  )
}
