'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft } from 'lucide-react'

const postSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  coverImage: z.string().optional(),
  isFeatured: z.boolean(),
  status: z.enum(['draft', 'published']),
  tags: z.string().optional(),
})

type PostFormValues = z.infer<typeof postSchema>

export default function CreatePostPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '',
      coverImage: '',
      isFeatured: false,
      status: 'draft',
      tags: ''
    }
  })

  const isFeatured = watch('isFeatured')
  const statusValue = watch('status')

  const onSubmit = async (data: PostFormValues) => {
    setIsSubmitting(true)
    
    try {
      const loadingToastId = 'creating-post'
      toast.loading('Creating post...', { id: loadingToastId })
      
      // Prepare the tags array
      const tagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()) : []
      
      // In a real app, you would send to the API:
      // const response = await fetch('/api/posts', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     ...data,
      //     tags: tagsArray
      //   })
      // })
      
      // Mock creation
      console.log('Creating post with data:', { ...data, tags: tagsArray })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Post created successfully', { id: loadingToastId })
      router.push('/admin/blog')
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post', { id: 'creating-post' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // In a real app, you would handle the file upload
    // For now, we'll just set a placeholder
    if (e.target.files && e.target.files[0]) {
      toast.success('Image uploaded successfully')
      // setValue('coverImage', URL.createObjectURL(e.target.files[0]))
      setValue('coverImage', '/placeholder-image.jpg') // Using placeholder for now
    }
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
      <Card>
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/admin/blog')}
              className="p-0 mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <CardTitle>Create New Post</CardTitle>
          <CardDescription>Write a new blog post</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter post title"
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                {...register('slug')}
                placeholder="enter-post-slug"
              />
              {errors.slug && (
                <p className="text-sm text-red-600">{errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                {...register('content')}
                placeholder="Write your post content here..."
                rows={10}
              />
              {errors.content && (
                <p className="text-sm text-red-600">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image</Label>
              <Input
                id="coverImage"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {register('coverImage').value && (
                <div className="mt-2">
                  <img 
                    src={register('coverImage').value} 
                    alt="Cover preview" 
                    className="w-32 h-20 object-cover rounded"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isFeatured"
                  checked={isFeatured}
                  onCheckedChange={(checked) => setValue('isFeatured', checked)}
                />
                <Label htmlFor="isFeatured">Feature this post</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={statusValue}
                  onChange={(e) => setValue('status', e.target.value as 'draft' | 'published')}
                  className="border rounded px-2 py-1"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                {...register('tags')}
                placeholder="nextjs, tutorial, webdev"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/admin/blog')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Post'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}