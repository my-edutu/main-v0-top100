import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // In a real application, you would:
    // 1. Authenticate the user
    // 2. Validate the request body
    // 3. Save the blog post to your database
    // 4. Return the created blog post

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.content) {
      return Response.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // In a real application, you would save to your database here
    // For now, we'll return a mock response
    const newBlogPost = {
      id: `blog_${Date.now()}`,
      title: body.title,
      excerpt: body.excerpt || body.content.substring(0, 100) + '...',
      content: body.content,
      author: 'Current User', // This would come from auth
      date: new Date().toISOString(),
      tags: body.tags ? body.tags.split(',').map((tag: string) => tag.trim()) : [],
      readTime: `${Math.ceil(body.content.split(' ').length / 200)} min read`,
      status: body.status || 'draft',
    };

    return Response.json(newBlogPost);
  } catch (error) {
    console.error('Error creating blog post:', error);
    return Response.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // In a real application, you would fetch blog posts from your database
    // For now, we'll return mock data
    const blogPosts = [
      {
        id: '1',
        title: 'The Impact of Youth Leadership in Africa',
        excerpt: 'Exploring how young leaders are driving transformation across the continent...',
        content: 'Exploring how young leaders are driving transformation across the continent...',
        author: 'John Doe',
        date: '2024-05-15T10:30:00Z',
        tags: ['leadership', 'youth', 'africa'],
        readTime: '5 min read',
        status: 'published',
      },
      {
        id: '2',
        title: 'My Journey as a Top100 Awardee',
        excerpt: 'Reflections on the experience of being recognized as a Top100 Africa Future Leader...',
        content: 'Reflections on the experience of being recognized as a Top100 Africa Future Leader...',
        author: 'Jane Smith',
        date: '2024-06-20T14:45:00Z',
        tags: ['top100', 'awardee', 'journey'],
        readTime: '6 min read',
        status: 'draft',
      }
    ];

    return Response.json(blogPosts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return Response.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}