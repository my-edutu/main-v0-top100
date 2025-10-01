"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { Calendar, ArrowRight, User } from "lucide-react"

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

export default function BlogSection() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedPosts = async () => {
      try {
        // In a real app, you would fetch from the API:
        // const res = await fetch('/api/posts/featured?limit=3&isFeatured=true')
        // const data = await res.json()
        
        // For now, using mock data
        const mockPosts: BlogPost[] = [
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
            isFeatured: true,
            status: 'published',
            tags: ['Leadership', 'Mentorship'],
            createdAt: '2024-12-05T00:00:00Z',
            updatedAt: '2024-12-05T00:00:00Z'
          }
        ]
        
        setBlogPosts(mockPosts)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching featured posts:', error)
        setLoading(false)
      }
    }

    fetchFeaturedPosts()
  }, [])

  if (loading) {
    return (
      <section id="blog" className="py-20 bg-zinc-900/30 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
              Stories & Insights
            </h2>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
              Discover inspiring stories and insights from Africa's future leaders
            </p>
          </div>
          <div className="text-center py-10">
            Loading featured posts...
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="blog" className="py-20 bg-zinc-900/30 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            Stories & Insights
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
            Discover inspiring stories and insights from Africa's future leaders
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
                    <Badge className="bg-orange-500/90 text-white backdrop-blur-sm">
                      {post.tags && post.tags.length > 0 ? post.tags[0] : 'Featured'}
                    </Badge>
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

        <div className="text-center">
          <Button
            size="lg"
            variant="outline"
            className="border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-black px-8 py-6 rounded-full text-lg bg-transparent"
            asChild
          >
            <Link href="/blog">
              Read More Stories
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
