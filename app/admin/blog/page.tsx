'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, Plus, FileText, BarChart3, TrendingUp, Eye, Heart, ChevronLeft, ChevronRight, Star, Search, Pencil, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageHeader from '../components/PageHeader'

interface AdminPost {
  id: string
  title: string
  slug: string
  content: string | null
  coverImage: string | null
  coverImageAlt: string | null
  isFeatured: boolean
  status: string
  tags: string[]
  createdAt: string
  updatedAt: string
  scheduledAt: string | null
}

interface Stats {
  totalPosts: number
  publishedPosts: number
  featuredPosts: number
  draftPosts: number
  scheduledPosts: number
}

interface RawPostRecord {
  id: string
  title?: string
  slug?: string
  content?: string | null
  cover_image?: string | null
  coverImage?: string | null
  cover_image_alt?: string | null
  coverImageAlt?: string | null
  is_featured?: boolean
  isFeatured?: boolean
  status?: string
  tags?: unknown
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  scheduled_at?: string | null
  scheduledAt?: string | null
}

const mapPostRecord = (raw: RawPostRecord): AdminPost => {
  const createdAt = raw.created_at ?? raw.createdAt ?? new Date().toISOString()
  const updatedAt = raw.updated_at ?? raw.updatedAt ?? createdAt
  const scheduledAt = raw.scheduled_at ?? raw.scheduledAt ?? null

  return {
    id: raw.id,
    title: raw.title ?? 'Untitled post',
    slug: raw.slug ?? '',
    content: raw.content ?? null,
    coverImage: raw.cover_image ?? raw.coverImage ?? null,
    coverImageAlt: raw.cover_image_alt ?? raw.coverImageAlt ?? null,
    isFeatured: Boolean(raw.is_featured ?? raw.isFeatured),
    status: raw.status ?? 'draft',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    createdAt,
    updatedAt,
    scheduledAt
  }
}

const statusBadgeClass = (status: string) =>
  status === 'published'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : status === 'scheduled'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-zinc-100 text-zinc-600 border-zinc-200'

export default function AdminBlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminPost | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'scheduled'>('all')

  const stats = useMemo<Stats>(() => {
    return {
      totalPosts: posts.length,
      publishedPosts: posts.filter(post => post.status === 'published').length,
      featuredPosts: posts.filter(post => post.isFeatured).length,
      draftPosts: posts.filter(post => post.status === 'draft').length,
      scheduledPosts: posts.filter(post => post.status === 'scheduled').length
    }
  }, [posts])

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return posts.filter(post => {
      const matchesSearch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.slug.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [posts, search, statusFilter])

  const [spotlightPage, setSpotlightPage] = useState(0)
  const SPOTLIGHT_PER_PAGE = 3

  const featuredPosts = useMemo(() => posts.filter(post => post.isFeatured), [posts])

  const fetchPosts = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {
    const toastId = 'loading-posts'

    if (withSpinner) {
      setLoading(true)
      toast.loading('Loading posts...', { id: toastId })
    }

    try {
      const response = await fetch('/api/posts?scope=admin', { cache: 'no-store' })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error Response:', errorData)
        throw new Error(errorData.message || errorData.error || 'Failed to fetch posts')
      }

      const data = await response.json()
      const mapped: AdminPost[] = Array.isArray(data) ? data.map(mapPostRecord) : []

      setPosts(mapped)

      if (withSpinner) {
        toast.success('Posts loaded successfully', { id: toastId })
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      if (withSpinner) {
        toast.error('Failed to fetch posts', { id: toastId })
      } else {
        toast.error('Live update failed to refresh posts')
      }
    } finally {
      if (withSpinner) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    // The memoized loader owns the asynchronous state transitions for this external sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    const channel = supabase
      .channel('admin-posts-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts({ withSpinner: false })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPosts])

  const toggleFeatured = async (postId: string, nextValue: boolean) => {
    const toastId = `toggle-featured-${postId}`
    toast.loading('Updating post...', { id: toastId })

    try {
      const response = await fetch('/api/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId, is_featured: nextValue })
      })

      if (!response.ok) throw new Error('Failed to update post')

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId ? { ...post, isFeatured: nextValue } : post
        )
      )

      toast.success('Post updated successfully', { id: toastId })
    } catch (error) {
      console.error('Error updating post:', error)
      toast.error('Failed to update post', { id: toastId })

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId ? { ...post, isFeatured: !nextValue } : post
        )
      )
    }
  }

  const performDelete = async (postId: string) => {
    const toastId = `delete-post-${postId}`

    try {
      setDeleting(postId)
      toast.loading('Deleting post...', { id: toastId })

      const response = await fetch('/api/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId })
      })

      if (!response.ok) throw new Error('Failed to delete post')

      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
      toast.success('Post deleted successfully', { id: toastId })
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post', { id: toastId })
    } finally {
      setDeleting(null)
      setDeleteTarget(null)
    }
  }

  const handleAddNewPost = () => {
    router.push('/admin/blog/new')
  }

  const renderStatsValue = (value: number) => {
    if (loading) {
      return <div className="editorial-metric-loading animate-pulse" />
    }

    return value
  }

  const hasFilters = search.trim().length > 0 || statusFilter !== 'all'

  return (
    <div className="editorial-admin-page space-y-6 pb-4 animate-in fade-in duration-300">
      <PageHeader
        eyebrow="Content studio"
        title="Editorial"
        description="Create, schedule, and spotlight stories across the Top100 platform."
        actions={(
          <Button onClick={handleAddNewPost} className="admin-primary">
            <Plus className="h-4 w-4" />
            Create article
          </Button>
        )}
      />

      <section className="space-y-3" aria-labelledby="editorial-overview-heading">
        <div className="editorial-section-heading">
          <div>
            <p className="admin-kicker">Publishing pulse</p>
            <h2 id="editorial-overview-heading">Content overview</h2>
          </div>
          <p>Live totals across the editorial library.</p>
        </div>
        <div className="editorial-metrics">
        <KPITile
          label="All articles"
          value={renderStatsValue(stats.totalPosts)}
          icon={FileText}
          color="blue"
          subValue="Across every status"
        />
        <KPITile
          label="Published"
          value={renderStatsValue(stats.publishedPosts)}
          icon={BarChart3}
          color="emerald"
          subValue="Visible to readers"
        />
        <KPITile
          label="Spotlight"
          value={renderStatsValue(stats.featuredPosts)}
          icon={Heart}
          color="rose"
          subValue="Promoted on homepage"
        />
        <KPITile
          label="Scheduled"
          value={renderStatsValue(stats.scheduledPosts)}
          icon={TrendingUp}
          color="amber"
          subValue="Queued to publish"
        />
        </div>
      </section>

      {/* Content + Spotlight */}
      <div className="editorial-workspace">
        <Card className="editorial-library admin-panel">
          <CardHeader className="editorial-library-header">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="editorial-library-title">
                  <span><Eye className="h-5 w-5" /></span>
                  Article library
                </CardTitle>
                {!loading && (
                  <span className="editorial-result-count">
                    {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}
                  </span>
                )}
              </div>

              {/* Toolbar: search + status filter */}
              <div className="editorial-toolbar">
                <div className="editorial-search">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title or slug..."
                    aria-label="Search articles"
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <SelectTrigger aria-label="Filter by status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y divide-zinc-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 rounded bg-zinc-100" />
                      <div className="h-2.5 w-1/3 rounded bg-zinc-100" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-zinc-100" />
                    <div className="h-6 w-10 rounded-full bg-zinc-100 hidden sm:block" />
                    <div className="h-8 w-16 rounded-lg bg-zinc-100" />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <FileText className="h-7 w-7 text-orange-500" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-zinc-800">
                    {hasFilters ? 'No matching articles' : 'No articles yet'}
                  </p>
                  <p className="text-sm text-zinc-500 max-w-xs">
                    {hasFilters
                      ? 'Try adjusting your search or status filter.'
                      : 'Create your first article to start building your content library.'}
                  </p>
                </div>
                {hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => { setSearch(''); setStatusFilter('all') }}
                    className="rounded-xl border-zinc-200"
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={handleAddNewPost} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md shadow-orange-200">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Article
                  </Button>
                )}
              </div>
            ) : (
              <ResponsiveTable
                data={filteredPosts}
                breakpoint="xl"
                getRowKey={post => post.id}
                className="[&>div:first-child]:rounded-none [&>div:first-child]:border-0 [&>div:last-child]:space-y-0 [&>div:last-child]:divide-y [&>div:last-child]:divide-zinc-100"
                columns={[
                  {
                    key: 'title',
                    header: 'Title',
                    className: 'font-medium text-zinc-800 pl-6 max-w-[320px]',
                    cell: post => (
                      <div className="flex flex-col">
                        <span className="line-clamp-1">{post.title}</span>
                        <span className="text-[11px] text-zinc-400 line-clamp-1">/{post.slug}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'date',
                    header: 'Date',
                    className: 'text-zinc-500 whitespace-nowrap',
                    cell: post => format(new Date(post.createdAt), 'MMM dd, yyyy'),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: post => (
                      <Badge variant="outline" className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider capitalize",
                        statusBadgeClass(post.status)
                      )}>
                        {post.status}
                      </Badge>
                    ),
                  },
                  {
                    key: 'featured',
                    header: 'Featured',
                    cell: post => (
                      <Switch
                        checked={post.isFeatured}
                        onCheckedChange={checked => toggleFeatured(post.id, checked)}
                        aria-label={`Toggle featured for ${post.title}`}
                        className="data-[state=checked]:bg-rose-500"
                      />
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    className: 'text-right pr-6',
                    cell: post => (
                      <div className="flex justify-end items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/blog/edit/${post.id}`)}
                          aria-label={`Edit ${post.title}`}
                          className="h-9 w-9 rounded-xl text-zinc-500 hover:text-orange-600 hover:bg-orange-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(post)}
                          disabled={deleting === post.id}
                          aria-label={`Delete ${post.title}`}
                          className="h-9 w-9 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          {deleting === post.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ),
                  },
                ]}
                renderCard={post => (
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-800 line-clamp-2 leading-snug">{post.title}</p>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">/{post.slug}</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider capitalize",
                        statusBadgeClass(post.status)
                      )}>
                        {post.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                      </span>
                      <label className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="font-medium">Featured</span>
                        <Switch
                          checked={post.isFeatured}
                          onCheckedChange={checked => toggleFeatured(post.id, checked)}
                          aria-label={`Toggle featured for ${post.title}`}
                          className="data-[state=checked]:bg-rose-500"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/blog/edit/${post.id}`)}
                        className="h-11 flex-1 rounded-xl border-zinc-200 text-zinc-700"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(post)}
                        disabled={deleting === post.id}
                        aria-label={`Delete ${post.title}`}
                        className="h-11 w-11 rounded-xl border-zinc-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        {deleting === post.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Right Column: Hero Spotlight Preview */}
        <aside className="editorial-side-column">
          <Card className="editorial-spotlight admin-panel">
            <CardHeader className="editorial-spotlight-header">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="admin-kicker">Homepage curation</p>
                  <CardTitle className="editorial-spotlight-title">
                    <span><Star className="h-4 w-4" /></span> Spotlight
                  </CardTitle>
                  <p className="editorial-spotlight-description">Choose the stories promoted on the public homepage.</p>
                </div>
                {featuredPosts.length > SPOTLIGHT_PER_PAGE && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSpotlightPage(p => Math.max(0, p - 1))}
                      disabled={spotlightPage === 0}
                      aria-label="Previous spotlight page"
                      className="editorial-page-button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSpotlightPage(p => Math.min(Math.ceil(featuredPosts.length / SPOTLIGHT_PER_PAGE) - 1, p + 1))}
                      disabled={spotlightPage >= Math.ceil(featuredPosts.length / SPOTLIGHT_PER_PAGE) - 1}
                      aria-label="Next spotlight page"
                      className="editorial-page-button"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="editorial-spotlight-content">
              {featuredPosts.length === 0 ? (
                <div className="editorial-spotlight-empty">
                  <Star className="h-5 w-5" />
                  <span>No active spotlight stories</span>
                </div>
              ) : (
                featuredPosts.slice(spotlightPage * SPOTLIGHT_PER_PAGE, (spotlightPage + 1) * SPOTLIGHT_PER_PAGE).map(post => (
                  <article key={post.id} className="editorial-spotlight-item">
                    <div className="flex justify-between items-start gap-4 relative z-10">
                      <div className="flex-1 min-w-0">
                        <h4>{post.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400 font-medium">{format(new Date(post.updatedAt), 'MMM dd, yyyy')}</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-300" />
                          <span className="editorial-spotlight-label">Spotlight</span>
                        </div>
                      </div>
                      <Switch
                        checked={true}
                        onCheckedChange={() => toggleFeatured(post.id, false)}
                        aria-label={`Remove ${post.title} from spotlight`}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>
                    {post.coverImage && (
                      <div className="editorial-spotlight-image">
                        {/* Remote editorial images can come from multiple configured storage hosts. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.coverImage} alt={post.coverImageAlt || post.title} />
                      </div>
                    )}
                  </article>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="editorial-draft-health admin-panel">
            <CardContent className="editorial-draft-health-content">
              <div><p className="admin-kicker">Workflow health</p><h3>Draft share</h3></div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Articles still in draft</span>
                  <span className="text-zinc-700 font-medium">{stats.totalPosts > 0 ? Math.round((stats.draftPosts / stats.totalPosts) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${stats.totalPosts > 0 ? (stats.draftPosts / stats.totalPosts) * 100 : 0}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent className="bg-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900">Delete this article?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              {deleteTarget ? (
                <>&ldquo;{deleteTarget.title}&rdquo; will be permanently removed. This action cannot be undone.</>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) performDelete(deleteTarget.id) }}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Sub-components

function KPITile({ label, value, icon: Icon, color, subValue }: {
  label: string
  value: ReactNode
  icon: LucideIcon
  color: 'blue' | 'emerald' | 'amber' | 'rose'
  subValue: string
}) {
  return (
    <article className={`editorial-metric editorial-metric-${color}`}>
      <span><Icon aria-hidden="true" /></span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <small>{subValue}</small>
      </div>
    </article>
  )
}
