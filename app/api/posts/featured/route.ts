import { NextRequest } from 'next/server'
import { validateRequest } from '@/lib/auth-server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit')
    const isFeatured = searchParams.get('isFeatured')
    const status = searchParams.get('status')

    // Fetch posts based on query parameters
    const posts = await prisma.post.findMany({
      where: {
        ...(isFeatured === 'true' ? { isFeatured: true } : {}),
        ...(status ? { status } : { status: 'published' }) // Default to published posts
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {}) // Limit number of results if specified
    })

    return new Response(JSON.stringify(posts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error fetching posts', error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}