import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
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
  try {
    const supabase = createClient()
    const id = req.nextUrl.searchParams.get('id')

    if (id) {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching post:', error)
        return NextResponse.json({ message: 'Error fetching post', error: error.message }, { status: 500 })
      }

      if (!data) {
        return NextResponse.json({ message: 'Post not found' }, { status: 404 })
      }

      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({ message: 'Error fetching posts', error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
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
    const { title, slug, content, cover_image, coverImage, is_featured, isFeatured, status, tags } = body

    const payload = {
      title,
      slug,
      content,
      cover_image: cover_image ?? coverImage ?? null,
      is_featured: Boolean(is_featured ?? isFeatured),
      status: status ?? 'draft',
      tags: normalizeTags(tags),
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
    const { id, title, slug, content, cover_image, coverImage, is_featured, isFeatured, status, tags } = body

    if (!id) {
      return NextResponse.json({ message: 'Post id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('posts')
      .update({
        title,
        slug,
        content,
        cover_image: cover_image ?? coverImage ?? null,
        is_featured: Boolean(is_featured ?? isFeatured),
        status: status ?? 'draft',
        tags: normalizeTags(tags),
      })
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
