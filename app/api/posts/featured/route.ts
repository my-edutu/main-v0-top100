import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit')
    const isFeatured = searchParams.get('isFeatured')
    const status = searchParams.get('status')

    // For development, we'll return mock data
    // In production, this would fetch from a database
    let mockPosts = [
      {
        id: '1',
        title: 'Getting Started with Next.js',
        slug: 'getting-started-nextjs',
        content: 'This is a sample blog post content...',
        coverImage: '/placeholder-image.jpg',
        isFeatured: true,
        status: 'published',
        tags: ['Next.js', 'Tutorial'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Building Secure Applications',
        slug: 'building-secure-applications',
        content: 'This is a sample blog post content about security...',
        coverImage: '/placeholder-image.jpg',
        isFeatured: true,
        status: 'published',
        tags: ['Security', 'Best Practices'],
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000).toISOString()
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
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    // Filter based on parameters
    if (isFeatured === 'true') {
      mockPosts = mockPosts.filter(post => post.isFeatured);
    }
    
    if (status) {
      mockPosts = mockPosts.filter(post => post.status === status);
    } else {
      // Default to published posts
      mockPosts = mockPosts.filter(post => post.status === 'published');
    }

    // Limit results if specified
    if (limit) {
      mockPosts = mockPosts.slice(0, parseInt(limit));
    }

    return new Response(JSON.stringify(mockPosts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error fetching posts', error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}