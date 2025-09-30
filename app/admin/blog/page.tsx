'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
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
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, Plus } from 'lucide-react'

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

export default function AdminBlogPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPosts()
    }
  }, [status])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      toast.loading('Loading posts...', { id: 'loading-posts' })
      
      // For now, we'll use mock data since we don't have a real database
      const mockPosts: Post[] = [
        {
          id: '1',
          title: 'Getting Started with Next.js',
          slug: 'getting-started-nextjs',
          content: 'This is a sample blog post content...',
          coverImage: '/placeholder-image.jpg',
          isFeatured: true,
          status: 'published',
          tags: ['Next.js', 'Tutorial'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Building Secure Applications',
          slug: 'building-secure-applications',
          content: 'This is a sample blog post content about security...',
          coverImage: '/placeholder-image.jpg',
          isFeatured: false,
          status: 'draft',
          tags: ['Security', 'Best Practices'],
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          updatedAt: new Date(Date.now() - 86400000)
        },
        {
          id: '3',
          title: 'Advanced TypeScript Patterns',
          slug: 'advanced-typescript-patterns',
          content: 'This is a sample blog post content about TypeScript...',
          coverImage: '/placeholder-image.jpg',
          isFeatured: true,
          status: 'published',
          tags: ['TypeScript', 'Patterns'],
          createdAt: new Date(Date.now() - 172800000), // 2 days ago
          updatedAt: new Date(Date.now() - 172800000)
        }
      ]
      
      setPosts(mockPosts)
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
      
      // Update the post in the UI immediately
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, isFeatured: !currentFeatured } : post
      ))
      
      // In a real app, you would make an API call here
      // const response = await fetch(`/api/posts/${postId}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ isFeatured: !currentFeatured })
      // })
      
      // if (!response.ok) throw new Error('Failed to update post')
      
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
      
      // In a real app, you would make an API call here
      // const response = await fetch(`/api/posts/${postId}`, {
      //   method: 'DELETE'
      // })
      
      // if (!response.ok) throw new Error('Failed to delete post')
      
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

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <div className="p-6">Access denied. Please sign in.</div>
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Blog Dashboard</h1>
        <Button onClick={handleAddNewPost}>
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