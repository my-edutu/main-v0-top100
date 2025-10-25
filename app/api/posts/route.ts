import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { getHomepagePosts, getPostBySlug, getPublishedPosts } from '@/lib/posts/server'
import { createClient } from '@/lib/supabase/server'

const normalizeTags = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim())
  }

  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  return []
}

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope') ?? 'public'
  const id = req.nextUrl.searchParams.get('id')
  const slug = req.nextUrl.searchParams.get('slug')

  try {
    if (scope === 'admin') {
      const adminCheck = await requireAdmin(req)
      if ('error' in adminCheck) {
        return adminCheck.error
      }

      const supabase = createClient(true)

      if (id) {
        const { data, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()

        if (error) {
          console.error('Error fetching post:', error)
          return NextResponse.json({ message: 'Error fetching post', error: error.message }, { status: 500 })
        }

        if (!data) {
          return NextResponse.json({ message: 'Post not found' }, { status: 404 })
        }

        return NextResponse.json(data)
      }

      if (slug) {
        const { data, error } = await supabase.from('posts').select('*').eq('slug', slug).maybeSingle()

        if (error) {
          console.error('Error fetching post by slug:', error)
          return NextResponse.json({ message: 'Error fetching post', error: error.message }, { status: 500 })
        }

        if (!data) {
          return NextResponse.json({ message: 'Post not found' }, { status: 404 })
        }

        return NextResponse.json(data)
      }

      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching posts:', error)
        return NextResponse.json({ message: 'Error fetching posts', error: error.message }, { status: 500 })
      }

      return NextResponse.json(data ?? [])
    }

    if (slug) {
      const post = await getPostBySlug(slug)
      if (!post) {
        return NextResponse.json({ message: 'Post not found' }, { status: 404 })
      }

      return NextResponse.json(post)
    }

    if (scope === 'homepage') {
      const homepagePosts = await getHomepagePosts()
      return NextResponse.json(homepagePosts)
    }

    const posts = await getPublishedPosts()
    return NextResponse.json(posts)
  } catch (error) {
    console.error('Error in posts GET:', error)
    return NextResponse.json(
      { message: 'Error fetching posts', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = createClient(true)
    const body = await req.json()
    const {
      title,
      slug,
      content,
      cover_image,
      coverImage,
      is_featured,
      isFeatured,
      status,
      tags,
      author,
      excerpt,
      read_time,
      readTime,
    } = body

    const payload: Record<string, unknown> = {
      title,
      slug,
      content,
      cover_image: cover_image ?? coverImage ?? null,
      is_featured: Boolean(is_featured ?? isFeatured),
      status: status ?? 'draft',
      tags: normalizeTags(tags),
    }

    if (typeof author === 'string' && author.trim().length > 0) {
      payload.author = author.trim()
    }

    if (typeof excerpt === 'string' && excerpt.trim().length > 0) {
      payload.excerpt = excerpt.trim()
    }

    const suppliedReadTime = typeof read_time === 'number' ? read_time : typeof readTime === 'number' ? readTime : null
    if (typeof suppliedReadTime === 'number' && Number.isFinite(suppliedReadTime)) {
      payload.read_time = Math.max(1, Math.round(suppliedReadTime))
    }

    const { data, error } = await supabase.from('posts').insert([payload]).select().single()

    if (error) {
      console.error('Error creating post:', error)
      return NextResponse.json({ message: 'Error creating post', error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in posts POST:', error)
    return NextResponse.json(
      { message: 'Error creating post', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = createClient(true)
    const body = await req.json()
    const {
      id,
      title,
      slug,
      content,
      cover_image,
      coverImage,
      is_featured,
      isFeatured,
      status,
      tags,
      author,
      excerpt,
      read_time,
      readTime,
    } = body

    if (!id) {
      return NextResponse.json({ message: 'Post id is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      title,
      slug,
      content,
      cover_image: cover_image ?? coverImage ?? null,
      is_featured: Boolean(is_featured ?? isFeatured),
      status: status ?? 'draft',
      tags: normalizeTags(tags),
    }

    if (typeof author === 'string' && author.trim().length > 0) {
      updates.author = author.trim()
    }

    if (typeof excerpt === 'string' && excerpt.trim().length > 0) {
      updates.excerpt = excerpt.trim()
    }

    const suppliedReadTime = typeof read_time === 'number' ? read_time : typeof readTime === 'number' ? readTime : null
    if (typeof suppliedReadTime === 'number' && Number.isFinite(suppliedReadTime)) {
      updates.read_time = Math.max(1, Math.round(suppliedReadTime))
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating post:', error)
      return NextResponse.json({ message: 'Error updating post', error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in posts PUT:', error)
    return NextResponse.json(
      { message: 'Error updating post', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = createClient(true)
    const body = await req.json()
    const { id, is_featured, isFeatured, status, visibility } = body

    if (!id) {
      return NextResponse.json({ message: 'Post id is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof is_featured !== 'undefined' || typeof isFeatured !== 'undefined') {
      updates.is_featured = Boolean(is_featured ?? isFeatured)
    }
    if (typeof status === 'string') {
      updates.status = status
    }
    if (typeof visibility === 'string') {
      updates.visibility = visibility
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 })
    }

    const { data, error } = await supabase.from('posts').update(updates).eq('id', id).select().single()

    if (error) {
      console.error('Error updating post:', error)
      return NextResponse.json({ message: 'Error updating post', error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in posts PATCH:', error)
    return NextResponse.json(
      { message: 'Error updating post', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = createClient(true)
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ message: 'Post id is required' }, { status: 400 })
    }

    const { error } = await supabase.from('posts').delete().eq('id', id)

    if (error) {
      console.error('Error deleting post:', error)
      return NextResponse.json({ message: 'Error deleting post', error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in posts DELETE:', error)
    return NextResponse.json(
      { message: 'Error deleting post', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
