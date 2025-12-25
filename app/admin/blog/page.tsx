'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, Plus, FileText, BarChart3, TrendingUp, Eye, Heart, ChevronLeft, ChevronRight, Star } from 'lucide-react'

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

export default function AdminBlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const stats = useMemo<Stats>(() => {
    return {
      totalPosts: posts.length,
      publishedPosts: posts.filter(post => post.status === 'published').length,
      featuredPosts: posts.filter(post => post.isFeatured).length,
      draftPosts: posts.filter(post => post.status === 'draft').length,
      scheduledPosts: posts.filter(post => post.status === 'scheduled').length
    }
  }, [posts])

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

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

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

  // ... existing code ...

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-20 lg:pt-0">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Content Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
            Editorial <span className="text-purple-500">Control</span>
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium">
            Orchestrate your content strategy with real-time publishing.
          </p>
        </div>

        <Button onClick={handleAddNewPost} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 px-4 shadow-lg shadow-purple-500/20 font-bold">
          <Plus className="mr-1 h-4 w-4" />
          Create Article
        </Button>
      </div>

      {/* KPI Stats Grid - 2x2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPITile
          label="Total Content"
          value={stats.totalPosts}
          icon={FileText}
          color="blue"
          subValue="Articles"
        />
        <KPITile
          label="Live Now"
          value={stats.publishedPosts}
          icon={BarChart3}
          color="emerald"
          subValue="Public"
        />
        <KPITile
          label="Spotlight"
          value={stats.featuredPosts}
          icon={Heart}
          color="rose"
          subValue="Featured"
        />
        <KPITile
          label="Scheduled"
          value={stats.scheduledPosts}
          icon={TrendingUp}
          color="amber"
          subValue="Upcoming"
        />
      </div>

      {/* Featured Post Spotlight Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-white/5 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-zinc-400" />
                Content Library
              </CardTitle>
            </div>
          </CardHeader>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="p-0">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400 pl-6">Title</TableHead>
                    <TableHead className="text-zinc-400">Date</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Featured</TableHead>
                    <TableHead className="text-zinc-400 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map(post => (
                    <TableRow key={post.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="font-medium text-zinc-200 pl-6">
                        <div className="flex flex-col">
                          <span className="line-clamp-1">{post.title}</span>
                          {post.scheduledAt && post.status === 'scheduled' && (
                            <span className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
                              <TrendingUp className="h-3 w-3" /> Scheduled
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "border-0 px-2 py-0.5 rounded-full capitalize",
                          post.status === 'published' ? "bg-emerald-500/10 text-emerald-400" :
                            post.status === 'scheduled' ? "bg-amber-500/10 text-amber-400" :
                              "bg-zinc-700/50 text-zinc-400"
                        )}>
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={post.isFeatured}
                          onCheckedChange={checked => toggleFeatured(post.id, checked)}
                          className="data-[state=checked]:bg-rose-500"
                        />
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/admin/blog/edit/${post.id}`)}
                            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePost(post.id)}
                            disabled={deleting === post.id}
                            className="h-8 w-8 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            {deleting === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <div className="h-4 w-4">×</div> // Using simple character for delete icon to be safe or Trash icon if imported
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Right Column: Hero Spotlight Preview */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-rose-500/10 to-purple-500/10 border-rose-500/20 backdrop-blur-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-rose-500/10 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-rose-400 text-sm font-bold uppercase tracking-[0.15em] flex items-center gap-2">
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
                      className="h-7 w-7 rounded-full text-zinc-500 hover:text-white hover:bg-white/5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSpotlightPage(p => Math.min(Math.ceil(featuredPosts.length / SPOTLIGHT_PER_PAGE) - 1, p + 1))}
                      disabled={spotlightPage >= Math.ceil(featuredPosts.length / SPOTLIGHT_PER_PAGE) - 1}
                      className="h-7 w-7 rounded-full text-zinc-500 hover:text-white hover:bg-white/5"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {featuredPosts.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm border-2 border-dashed border-zinc-800 rounded-xl">
                  No active spotlight posts
                </div>
              ) : (
                featuredPosts.slice(spotlightPage * SPOTLIGHT_PER_PAGE, (spotlightPage + 1) * SPOTLIGHT_PER_PAGE).map(post => (
                  <div key={post.id} className="group relative bg-zinc-900/80 border border-white/5 rounded-2xl p-3.5 hover:border-rose-500/30 transition-all overflow-hidden">
                    {/* Faded Background Icon */}
                    <Star className="absolute -right-4 -bottom-4 h-20 w-20 text-rose-500 opacity-[0.03] -rotate-12 group-hover:scale-110 transition-transform duration-700" />

                    <div className="flex justify-between items-start gap-4 relative z-10">
                      <div className="flex-1">
                        <h4 className="font-bold text-zinc-200 text-sm line-clamp-2 leading-tight mb-1.5 group-hover:text-rose-400 transition-colors">{post.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 font-medium">{format(new Date(post.updatedAt), 'MMM dd, yyyy')}</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-700" />
                          <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Spotlight</span>
                        </div>
                      </div>
                      <Switch
                        checked={true}
                        onCheckedChange={() => toggleFeatured(post.id, false)}
                        className="scale-75 data-[state=checked]:bg-rose-500"
                      />
                    </div>
                    {post.coverImage && (
                      <div className="mt-4 aspect-[21/9] w-full rounded-xl bg-zinc-800 overflow-hidden relative border border-white/5">
                        <img src={post.coverImage} className="object-cover w-full h-full opacity-40 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-60" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
            <h3 className="text-zinc-400 text-sm font-medium">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Draft Rate</span>
                <span className="text-zinc-300">{stats.totalPosts > 0 ? Math.round((stats.draftPosts / stats.totalPosts) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${stats.totalPosts > 0 ? (stats.draftPosts / stats.totalPosts) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
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
      "relative p-6 rounded-[2rem] border-none bg-gradient-to-br shadow-xl overflow-hidden transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1 group",
      selectedColor
    )}>
      {/* Background Icon */}
      <Icon className="absolute -right-4 -bottom-4 h-24 w-24 text-white opacity-[0.08] -rotate-12 group-hover:scale-110 transition-transform duration-700" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-4xl font-black text-white tracking-tighter">{value}</p>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{label}</p>
            {subValue && <span className="text-[10px] font-medium text-white/90 bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">{subValue}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
