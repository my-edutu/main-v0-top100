'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, Plus, FileText, BarChart3, TrendingUp, Eye, Heart } from 'lucide-react'

interface Post {
  id: string
  title: string
  slug: string
  content: string
  coverImage?: string
  isFeatured: boolean
  status: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

interface Stats {
  totalPosts: number;
  publishedPosts: number;
  featuredPosts: number;
  draftPosts: number;
}

export default function AdminBlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    if (posts.length > 0) {
      calculateStats();
    }
  }, [posts]);

  const calculateStats = () => {
    const totalPosts = posts.length;
    const publishedPosts = posts.filter(p => p.status === 'published').length;
    const featuredPosts = posts.filter(p => p.isFeatured).length;
    const draftPosts = posts.filter(p => p.status === 'draft').length;

    setStats({
      totalPosts,
      publishedPosts,
      featuredPosts,
      draftPosts
    });
  };

  const fetchPosts = async () => {
    try {
      setLoading(true)
      toast.loading('Loading posts...', { id: 'loading-posts' })
      
      const response = await fetch('/api/posts')
      if (!response.ok) throw new Error('Failed to fetch posts')
      
      const data = await response.json()
      // Convert date strings to Date objects if necessary
      const postsWithDates = data.map((post: any) => ({
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt)
      }))
      
      setPosts(postsWithDates)
      toast.success('Posts loaded successfully', { id: 'loading-posts' })
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to fetch posts', { id: 'loading-posts' })
    } finally {
      setLoading(false)
    }
  }

  const toggleFeatured = async (postId: string, currentFeatured: boolean) => {
    try {
      const loadingToastId = `toggle-featured-${postId}`
      toast.loading('Updating post...', { id: loadingToastId })
      
      // Make API call to update the post
      const response = await fetch(`/api/posts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId, isFeatured: !currentFeatured })
      })
      
      if (!response.ok) throw new Error('Failed to update post')
      
      // Update the post in the UI
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, isFeatured: !currentFeatured } : post
      ))
      
      toast.success('Post updated successfully', { id: loadingToastId })
    } catch (error) {
      console.error('Error updating post:', error)
      toast.error('Failed to update post', { id: `toggle-featured-${postId}` })
      // Revert the change if the API call fails
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, isFeatured: currentFeatured } : post
      ))
    }
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    
    try {
      setDeleting(postId)
      const loadingToastId = `delete-post-${postId}`
      toast.loading('Deleting post...', { id: loadingToastId })
      
      const response = await fetch(`/api/posts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId })
      })
      
      if (!response.ok) throw new Error('Failed to delete post')
      
      setPosts(posts.filter(post => post.id !== postId))
      toast.success('Post deleted successfully', { id: loadingToastId })
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post', { id: `delete-post-${postId}` })
    } finally {
      setDeleting(false)
    }
  }

  const handleAddNewPost = () => {
    router.push('/admin/blog/new')
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Blog Dashboard
        </h1>
        <p className="text-muted-foreground">Manage your blog posts and content</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-blue-400/30 rounded-lg mr-3">
                <FileText className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Total Posts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-blue-400/30 rounded animate-pulse" /> : stats?.totalPosts || 0}
            </div>
            <p className="text-xs text-blue-100 mt-1">All blog posts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-green-400/30 rounded-lg mr-3">
                <TrendingUp className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Published</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-green-400/30 rounded animate-pulse" /> : stats?.publishedPosts || 0}
            </div>
            <p className="text-xs text-green-100 mt-1">Live on site</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-amber-400/30 rounded-lg mr-3">
                <Eye className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Featured</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-amber-400/30 rounded animate-pulse" /> : stats?.featuredPosts || 0}
            </div>
            <p className="text-xs text-amber-100 mt-1">Highlighted posts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="p-2 bg-gray-400/30 rounded-lg mr-3">
                <FileText className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Drafts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <div className="h-6 w-12 bg-gray-400/30 rounded animate-pulse" /> : stats?.draftPosts || 0}
            </div>
            <p className="text-xs text-gray-100 mt-1">Unpublished posts</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
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
                <TableHead>Tags</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>
                    {format(new Date(post.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {post.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="mr-1">
                        {tag}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={post.isFeatured}
                      onCheckedChange={(checked) => toggleFeatured(post.id, post.isFeatured)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
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
      
      {/* Toast container for notifications */}
      <div className="fixed bottom-4 right-4 z-50">
        {/* This is handled by the sonner Toaster component in the layout */}
      </div>
    </div>
  )
}