'use client'

// app/admin/member-posts/page.tsx
// Moderation console for member-authored posts.
//
// The model is publish-immediately, moderate-after: everything on this page is
// already live (or already hidden). `flag` takes a post down and tells the
// author why — they can fix it and publish again. `remove` takes it down for
// good; the author can no longer edit, re-publish or delete it, so the row
// survives as the record of the decision.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Eye, EyeOff, FileText, Loader2, RefreshCw, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MEMBER_POST_STATUSES,
  memberPostPath,
  type MemberPostStatus,
  type MemberPostWithAuthor,
} from '@/lib/member-posts/types'
import { moderateMemberPost } from '@/lib/member-posts/client'

const STATUS_LABELS: Record<MemberPostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  flagged: 'Flagged',
  removed: 'Removed',
}

const STATUS_VARIANT: Record<MemberPostStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  published: 'default',
  flagged: 'destructive',
  removed: 'secondary',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminMemberPostsPage() {
  const [posts, setPosts] = useState<MemberPostWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [setupMessage, setSetupMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<MemberPostStatus | 'all'>('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    setSetupMessage(null)
    try {
      const response = await fetch('/api/admin/member-posts')
      const data = await response.json().catch(() => ({}))

      if (response.status === 503) {
        setSetupMessage(data?.message || 'Member posts are not set up yet.')
        setPosts([])
        return
      }
      if (!response.ok) {
        setErrorMessage(data?.message || 'Failed to load member posts.')
        setPosts([])
        return
      }

      setPosts((data?.posts ?? []) as MemberPostWithAuthor[])
    } catch (error) {
      console.error('Error fetching member posts:', error)
      setErrorMessage('Failed to load member posts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => (statusFilter === 'all' ? posts : posts.filter((post) => post.status === statusFilter)),
    [posts, statusFilter],
  )

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((post) => post.status === 'published').length,
      flagged: posts.filter((post) => post.status === 'flagged').length,
      removed: posts.filter((post) => post.status === 'removed').length,
    }),
    [posts],
  )

  const moderate = useCallback(
    async (post: MemberPostWithAuthor, status: 'published' | 'flagged' | 'removed') => {
      const note = (noteDrafts[post.id] ?? '').trim()

      // A hidden post the author cannot see a reason for is the worst possible
      // outcome of this page, so a note is required to take one down.
      if ((status === 'flagged' || status === 'removed') && !note) {
        toast.error('Write a note explaining this to the author first.')
        return
      }

      setSavingId(post.id)
      try {
        await moderateMemberPost({ postId: post.id, status, moderationNote: note })
        toast.success(`Post ${STATUS_LABELS[status].toLowerCase()}.`)
        setNoteDrafts((prev) => ({ ...prev, [post.id]: '' }))
        await load()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not update this post.')
      } finally {
        setSavingId(null)
      }
    },
    [noteDrafts, load],
  )

  if (loading) {
    return (
      <div className="container mx-auto py-8 pt-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (setupMessage) {
    return (
      <div className="container mx-auto py-8 pt-8">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Member posts are not set up yet</h3>
            <p className="text-muted-foreground">{setupMessage}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto py-8 pt-8">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="font-semibold text-lg">Could not load member posts</h3>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-700 bg-clip-text text-transparent">
          Member Posts
        </h1>
        <p className="text-muted-foreground">
          Awardee-written posts on their public profiles. Published immediately, moderated here.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Published" value={stats.published} />
        <StatCard label="Flagged" value={stats.flagged} tone={stats.flagged > 0 ? 'warn' : undefined} />
        <StatCard label="Removed" value={stats.removed} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as MemberPostStatus | 'all')}
            >
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {MEMBER_POST_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No posts</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'all'
                ? 'No member has written a post yet.'
                : 'No posts match this filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{post.title}</h3>
                      <Badge variant={STATUS_VARIANT[post.status]}>{STATUS_LABELS[post.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {post.authorName} · {post.authorEmail}
                    </p>
                  </div>
                  <div className="text-sm md:text-right text-muted-foreground shrink-0">
                    <p>Published {formatDate(post.publishedAt)}</p>
                    <p className="text-xs">{post.viewCount} views</p>
                  </div>
                </div>

                {post.excerpt && <p className="text-sm text-muted-foreground">{post.excerpt}</p>}

                <details className="rounded-lg border border-border/60 p-3">
                  <summary className="text-sm font-medium cursor-pointer">Read the full post</summary>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {post.body}
                  </div>
                </details>

                {post.status === 'published' && post.authorSlug && (
                  <a
                    href={memberPostPath(post.authorSlug, post.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm text-orange-700 hover:underline"
                  >
                    View live page
                  </a>
                )}

                {post.moderationNote && (
                  <div className="rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                    Note to author: {post.moderationNote}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium block" htmlFor={`note-${post.id}`}>
                    Note to the author (required to flag or remove)
                  </label>
                  <Textarea
                    id={`note-${post.id}`}
                    rows={2}
                    value={noteDrafts[post.id] ?? ''}
                    onChange={(event) =>
                      setNoteDrafts((prev) => ({ ...prev, [post.id]: event.target.value }))
                    }
                    placeholder="Explain what needs to change, or why this is coming down..."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                  <span className="text-xs text-muted-foreground pt-2">Moderate:</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    disabled={savingId === post.id || post.status === 'published'}
                    onClick={() => void moderate(post, 'published')}
                  >
                    {savingId === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={savingId === post.id || post.status === 'flagged'}
                    onClick={() => void moderate(post, 'flagged')}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Flag &amp; hide
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-2"
                    disabled={savingId === post.id || post.status === 'removed'}
                    onClick={() => void moderate(post, 'removed')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove permanently
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <Card className={tone === 'warn' ? 'border-destructive/50' : undefined}>
      <CardContent className="pt-6">
        <p className={`text-2xl font-bold ${tone === 'warn' ? 'text-destructive' : ''}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
