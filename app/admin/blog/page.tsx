'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
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

const mapPostRecord = (raw: Record<string, any>): AdminPost => {
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
      return <div className="h-6 w-12 bg-white/30 rounded animate-pulse" />
    }

    return value
  }

  const hasFilters = search.trim().length > 0 || statusFilter !== 'all'

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-20 lg:pt-0">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Content Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 leading-none">
            Editorial <span className="text-orange-500">Control</span>
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium">
            Orchestrate your content strategy with real-time publishing.
          </p>
        </div>

        <Button onClick={handleAddNewPost} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 px-6 shadow-lg shadow-orange-200 font-bold shrink-0">
          <Plus className="mr-2 h-5 w-5" />
          Create Article
        </Button>
      </div>

      {/* KPI Stats Grid - 2x2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPITile
          label="Total Content"
          value={renderStatsValue(stats.totalPosts)}
          icon={FileText}
          color="blue"
          subValue="Articles"
        />
        <KPITile
          label="Live Now"
          value={renderStatsValue(stats.publishedPosts)}
          icon={BarChart3}
          color="emerald"
          subValue="Public"
        />
        <KPITile
          label="Spotlight"
          value={renderStatsValue(stats.featuredPosts)}
          icon={Heart}
          color="rose"
          subValue="Featured"
        />
        <KPITile
          label="Scheduled"
          value={renderStatsValue(stats.scheduledPosts)}
          icon={TrendingUp}
          color="amber"
          subValue="Upcoming"
        />
      </div>

      {/* Content + Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 px-4 sm:px-6 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-orange-600" />
                  Content Library
                </CardTitle>
                {!loading && (
                  <span className="text-xs font-medium text-zinc-400">
                    {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}
                  </span>
                )}
              </div>

              {/* Toolbar: search + status filter */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title or slug..."
                    aria-label="Search articles"
                    className="pl-10 h-10 rounded-xl border-zinc-200 bg-white focus:ring-1 focus:ring-orange-300 focus:border-orange-300"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger aria-label="Filter by status" className="h-10 w-full sm:w-44 rounded-xl border-zinc-200 bg-white">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
              <>
                {/* Desktop / tablet table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/70">
                      <TableRow className="hover:bg-transparent border-zinc-200">
                        <TableHead className="text-zinc-500 pl-6">Title</TableHead>
                        <TableHead className="text-zinc-500">Date</TableHead>
                        <TableHead className="text-zinc-500">Status</TableHead>
                        <TableHead className="text-zinc-500">Featured</TableHead>
                        <TableHead className="text-zinc-500 text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPosts.map(post => (
                        <TableRow key={post.id} className="border-zinc-100 hover:bg-orange-50/40 transition-colors group">
                          <TableCell className="font-medium text-zinc-800 pl-6 max-w-[320px]">
                            <div className="flex flex-col">
                              <span className="line-clamp-1">{post.title}</span>
                              <span className="text-[11px] text-zinc-400 line-clamp-1">/{post.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-500 whitespace-nowrap">
                            {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider capitalize",
                              statusBadgeClass(post.status)
                            )}>
                              {post.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={post.isFeatured}
                              onCheckedChange={checked => toggleFeatured(post.id, checked)}
                              aria-label={`Toggle featured for ${post.title}`}
                              className="data-[state=checked]:bg-rose-500"
                            />
                          </TableCell>
                          <TableCell className="text-right pr-6">
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile stacked cards */}
                <div className="md:hidden divide-y divide-zinc-100">
                  {filteredPosts.map(post => (
                    <div key={post.id} className="p-4 space-y-3">
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
                          className="flex-1 rounded-xl border-zinc-200 text-zinc-700"
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
                          className="rounded-xl border-zinc-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          {deleting === post.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Hero Spotlight Preview */}
        <div className="space-y-6">
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50/40 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-rose-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-rose-600 text-sm font-bold uppercase tracking-[0.15em] flex items-center gap-2">
                    <Star className="h-4 w-4 fill-current" /> Homepage Spotlight
                  </CardTitle>
                  <CardDescription className="text-zinc-500 text-xs font-medium">
                    Maximum visibility on the landing page hero section.
                  </CardDescription>
                </div>
                {featuredPosts.length > SPOTLIGHT_PER_PAGE && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSpotlightPage(p => Math.max(0, p - 1))}
                      disabled={spotlightPage === 0}
                      aria-label="Previous spotlight page"
                      className="h-8 w-8 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-100/60"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSpotlightPage(p => Math.min(Math.ceil(featuredPosts.length / SPOTLIGHT_PER_PAGE) - 1, p + 1))}
                      disabled={spotlightPage >= Math.ceil(featuredPosts.length / SPOTLIGHT_PER_PAGE) - 1}
                      aria-label="Next spotlight page"
                      className="h-8 w-8 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-100/60"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {featuredPosts.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-xl">
                  No active spotlight posts
                </div>
              ) : (
                featuredPosts.slice(spotlightPage * SPOTLIGHT_PER_PAGE, (spotlightPage + 1) * SPOTLIGHT_PER_PAGE).map(post => (
                  <div key={post.id} className="group relative bg-white border border-zinc-200 rounded-2xl p-3.5 hover:border-rose-300 hover:shadow-sm transition-all overflow-hidden">
                    <div className="flex justify-between items-start gap-4 relative z-10">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-800 text-sm line-clamp-2 leading-tight mb-1.5 group-hover:text-rose-600 transition-colors">{post.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400 font-medium">{format(new Date(post.updatedAt), 'MMM dd, yyyy')}</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-300" />
                          <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Spotlight</span>
                        </div>
                      </div>
                      <Switch
                        checked={true}
                        onCheckedChange={() => toggleFeatured(post.id, false)}
                        aria-label={`Remove ${post.title} from spotlight`}
                        className="scale-75 data-[state=checked]:bg-rose-500"
                      />
                    </div>
                    {post.coverImage && (
                      <div className="mt-4 aspect-[21/9] w-full rounded-xl bg-zinc-100 overflow-hidden relative border border-zinc-200">
                        <img src={post.coverImage} className="object-cover w-full h-full group-hover:scale-105 transition-all duration-700" alt={post.coverImageAlt || post.title} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-zinc-700 text-sm font-bold">Quick Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Draft Rate</span>
                  <span className="text-zinc-700 font-medium">{stats.totalPosts > 0 ? Math.round((stats.draftPosts / stats.totalPosts) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all" style={{ width: `${stats.totalPosts > 0 ? (stats.draftPosts / stats.totalPosts) * 100 : 0}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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

function KPITile({ label, value, icon: Icon, color, subValue }: any) {
  const colors: any = {
    blue: "from-blue-600 to-cyan-500 shadow-blue-500/20",
    emerald: "from-emerald-600 to-teal-500 shadow-emerald-500/20",
    amber: "from-orange-500 to-amber-500 shadow-orange-500/20",
    rose: "from-rose-600 to-pink-500 shadow-rose-500/20",
    purple: "from-purple-600 to-indigo-600 shadow-purple-500/20",
  }

  const selectedColor = colors[color] || colors.blue

  return (
    <div className={cn(
      "relative p-5 sm:p-6 rounded-[2rem] border-none bg-gradient-to-br shadow-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 group",
      selectedColor
    )}>
      {/* Background Icon */}
      <Icon className="absolute -right-4 -bottom-4 h-24 w-24 text-white opacity-[0.08] -rotate-12 group-hover:scale-110 transition-transform duration-700" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tighter">{value}</div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{label}</p>
            {subValue && <span className="text-[10px] font-medium text-white/90 bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">{subValue}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
