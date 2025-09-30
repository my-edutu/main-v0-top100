import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ArrowRight, User } from 'lucide-react'

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  coverImage?: string;
  isFeatured: boolean;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default async function BlogPage() {
  let blogPosts: BlogPost[] = []

  try {
    // In a real app, you would fetch from the database:
    // blogPosts = await prisma.post.findMany({
    //   where: { status: 'published' },
    //   orderBy: { createdAt: 'desc' }
    // })
    
    // For now, using mock data
    blogPosts = [
      {
        id: '1',
        title: 'The Future of African Innovation',
        slug: 'future-of-african-innovation',
        content: 'Exploring how young leaders are driving technological advancement across the continent through groundbreaking solutions and creative thinking.',
        coverImage: '/placeholder.svg?key=blog1',
        isFeatured: true,
        status: 'published',
        tags: ['Innovation', 'Technology'],
        createdAt: '2024-12-15T00:00:00Z',
        updatedAt: '2024-12-15T00:00:00Z'
      },
      {
        id: '2',
        title: 'Building Sustainable Communities',
        slug: 'building-sustainable-communities',
        content: 'How our 2024 awardees are creating lasting environmental and social impact in their local communities through innovative approaches.',
        coverImage: '/placeholder.svg?key=blog2',
        isFeatured: true,
        status: 'published',
        tags: ['Sustainability', 'Environment'],
        createdAt: '2024-12-10T00:00:00Z',
        updatedAt: '2024-12-10T00:00:00Z'
      },
      {
        id: '3',
        title: 'Mentorship That Transforms',
        slug: 'mentorship-that-transforms',
        content: 'The power of mentorship in shaping Africa\'s future leaders and creating networks that span across borders and industries.',
        coverImage: '/placeholder.svg?key=blog3',
        isFeatured: false,
        status: 'published',
        tags: ['Leadership', 'Mentorship'],
        createdAt: '2024-12-05T00:00:00Z',
        updatedAt: '2024-12-05T00:00:00Z'
      },
      {
        id: '4',
        title: 'Tech Education for All',
        slug: 'tech-education-for-all',
        content: 'Breaking down barriers to technology education across Africa and making it accessible to everyone.',
        coverImage: '/placeholder.svg?key=blog4',
        isFeatured: false,
        status: 'published',
        tags: ['Education', 'Technology'],
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z'
      },
      {
        id: '5',
        title: 'Renewable Energy Solutions',
        slug: 'renewable-energy-solutions',
        content: 'Innovative approaches to renewable energy adoption across African communities.',
        coverImage: '/placeholder.svg?key=blog5',
        isFeatured: true,
        status: 'published',
        tags: ['Energy', 'Innovation'],
        createdAt: '2024-11-28T00:00:00Z',
        updatedAt: '2024-11-28T00:00:00Z'
      },
      {
        id: '6',
        title: 'Digital Financial Inclusion',
        slug: 'digital-financial-inclusion',
        content: 'How fintech is bridging the financial inclusion gap in Africa.',
        coverImage: '/placeholder.svg?key=blog6',
        isFeatured: false,
        status: 'published',
        tags: ['Fintech', 'Inclusion'],
        createdAt: '2024-11-20T00:00:00Z',
        updatedAt: '2024-11-20T00:00:00Z'
      }
    ]
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    blogPosts = []
  }

  return (
    <div className="min-h-screen py-12 bg-zinc-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            All Blog Posts
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
            Explore all our stories and insights
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {blogPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <article className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-orange-400/20 hover:border-orange-400/40 transition-all duration-300 group cursor-pointer hover:-translate-y-2">
                <div className="relative overflow-hidden">
                  <Image
                    src={post.coverImage || "/placeholder.svg"}
                    alt={post.title}
                    width={400}
                    height={250}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    {post.tags && post.tags.length > 0 ? (
                      <Badge className="bg-orange-500/90 text-white backdrop-blur-sm">
                        {post.tags[0]}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>

                <div className="p-6">
                  <div className="flex items-center text-sm text-zinc-400 mb-3">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="mx-2">•</span>
                    <span>5 min read</span>
                  </div>

                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-orange-300 transition-colors text-balance">
                    {post.title}
                  </h3>

                  <p className="text-zinc-300 mb-4 text-pretty line-clamp-3">{post.content}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-zinc-400">
                      <User className="w-4 h-4 mr-2" />
                      <span>Award Team</span>
                    </div>

                    <div className="flex items-center text-orange-400 group-hover:text-orange-300 transition-colors">
                      <span className="text-sm font-medium mr-2">Read more</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {blogPosts.length === 0 && (
          <div className="text-center py-10 text-zinc-400">
            No blog posts available yet.
          </div>
        )}
      </div>
    </div>
  )
}