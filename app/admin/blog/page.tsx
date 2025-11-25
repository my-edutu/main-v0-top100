'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
import { Loader2, Plus, FileText, BarChart3, TrendingUp, Eye, Heart } from 'lucide-react'

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

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Blog Dashboard
        </h1>
        <p className="text-muted-foreground">Manage posts that power the homepage in real time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-blue-400/30 rounded-lg mr-3">
                <FileText className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg md:text-xl font-bold">Total Posts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderStatsValue(stats.totalPosts)}</div>
            <p className="text-xs text-blue-100 mt-1">All blog posts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-green-400/30 rounded-lg mr-3">
                <BarChart3 className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg md:text-xl font-bold">Published</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderStatsValue(stats.publishedPosts)}</div>
            <p className="text-xs text-green-100 mt-1">Live on site</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-amber-400/30 rounded-lg mr-3">
                <Eye className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg md:text-xl font-bold">Featured</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderStatsValue(stats.featuredPosts)}</div>
            <p className="text-xs text-amber-100 mt-1">Homepage highlights</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-purple-400/30 rounded-lg mr-3">
                <TrendingUp className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg md:text-xl font-bold">Scheduled</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderStatsValue(stats.scheduledPosts)}</div>
            <p className="text-xs text-purple-100 mt-1">Posts scheduled for future</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Featured on Homepage
          </CardTitle>
          <CardDescription>
            Posts with the featured switch enabled appear immediately on the homepage hero section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featuredPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posts are currently featured. Toggle the switch below to spotlight a post on the homepage.
            </p>
          ) : (
            <div className="space-y-3">
              {featuredPosts.map(post => (
                <div key={post.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-3">
                  <div>
                    <p className="font-medium">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated {format(new Date(post.updatedAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-2 py-1 capitalize">{post.status}</span>
                    <span>Slug: {post.slug || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Posts</h2>
        <Button onClick={handleAddNewPost} className="bg-blue-500 hover:bg-blue-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add New Post
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading posts...</span>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Scheduled For</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map(post => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>{format(new Date(post.createdAt), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {post.status === 'scheduled' && post.scheduledAt
                      ? format(new Date(post.scheduledAt), 'MMM dd, yyyy HH:mm')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {post.tags.length === 0 ? (
                      <Badge variant="outline">No tags</Badge>
                    ) : (
                      post.tags.map((tag, index) => (
                        <Badge key={`${post.id}-${tag}-${index}`} variant="secondary" className="mr-1">
                          {tag}
                        </Badge>
                      ))
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={post.isFeatured}
                      onCheckedChange={checked => toggleFeatured(post.id, checked)}
                      aria-label={`Toggle featured state for ${post.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.status === 'published' ? 'default' : post.status === 'scheduled' ? 'outline' : 'secondary'}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/blog/edit/${post.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePost(post.id)}
                        disabled={deleting === post.id}
                      >
                        {deleting === post.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Delete'
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
    </div>
  )
}
