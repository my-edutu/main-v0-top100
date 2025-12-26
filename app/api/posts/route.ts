import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

import { requireAdmin } from '@/lib/api/require-admin'
import { getHomepagePosts, getPostBySlug, getPublishedPosts, selectHomepagePosts } from '@/lib/posts/server'
import { mapSupabaseRecord } from '@/lib/posts'
import { createAdminClient } from '@/lib/supabase/server'


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

      const supabase = createAdminClient()

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
      // Direct query to avoid caching issues
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .or('is_featured.eq.true')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching homepage posts:', error)
        return NextResponse.json({ message: 'Error fetching homepage posts', error: error.message }, { status: 500 })
      }

      // Map the raw Supabase records to ResolvedPost objects
      const homepagePosts = data.map(mapSupabaseRecord)
      const selectedPosts = selectHomepagePosts(homepagePosts)

      return NextResponse.json(selectedPosts)
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching published posts:', error)
      return NextResponse.json({ message: 'Error fetching posts', error: error.message }, { status: 500 })
    }

    const posts = data.map(mapSupabaseRecord)
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
    const supabase = createAdminClient()
    const body = await req.json()
    const {
      title,
      slug,
      content,
      cover_image,
      coverImage,
      cover_image_alt,
      coverImageAlt,
      is_featured,
      isFeatured,
      status,
      tags,
      author,
      author_id,
      excerpt,
      read_time,
      readTime,
      scheduled_at,
      scheduledAt,
      meta_title,
      metaTitle,
      meta_description,
      metaDescription,
      meta_keywords,
      metaKeywords,
    } = body

    // Log the incoming request data for debugging
    console.log('[POST /api/posts] Creating new post')
    console.log('[POST /api/posts] Request payload keys:', Object.keys(body))

    // Build payload object with all valid fields
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

    if (cover_image_alt !== undefined || coverImageAlt !== undefined) {
      payload.cover_image_alt = cover_image_alt ?? coverImageAlt ?? null
    }

    if (scheduled_at !== undefined || scheduledAt !== undefined) {
      payload.scheduled_at = scheduled_at ?? scheduledAt ?? null
    }

    if (meta_title !== undefined || metaTitle !== undefined) {
      payload.meta_title = meta_title ?? metaTitle ?? null
    }

    if (meta_description !== undefined || metaDescription !== undefined) {
      payload.meta_description = meta_description ?? metaDescription ?? null
    }

    if (meta_keywords !== undefined || metaKeywords !== undefined) {
      payload.meta_keywords = meta_keywords ?? metaKeywords ?? null
    }

    if (author_id) {
      payload.author_id = author_id
    }

    const { data, error } = await supabase.from('posts').insert([payload]).select().single()

    if (error) {
      console.error('Error creating post:', error)
      // Provide more specific error details to help with debugging
      return NextResponse.json(
        {
          message: 'Error creating post',
          error: error.message,
          details: {
            code: error.code,
            hint: error.hint,
            details: error.details
          }
        },
        { status: 500 }
      )
    }

    // Clear Next.js cache for relevant routes
    try {
      // Revalidate the homepage which contains the blog section
      revalidatePath('/');
      revalidatePath('/blog');
      revalidateTag('homepage-posts');
      revalidateTag('published-posts');
    } catch (revalidationError) {
      console.warn('Error during cache revalidation:', revalidationError);
    }

    console.log('[POST /api/posts] Post created successfully:', data?.id)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in posts POST:', error)
    return NextResponse.json(
      {
        message: 'Error creating post',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No stack trace'
      },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  console.log('[PUT /api/posts] ========== REQUEST RECEIVED ==========')

  // 1. Admin check
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    console.log('[PUT /api/posts] Admin check failed')
    return adminCheck.error
  }

  console.log('[PUT /api/posts] Admin check passed')

  try {
    const supabase = createAdminClient()
    const body = await req.json()

    console.log('[PUT /api/posts] Request body keys:', Object.keys(body))

    const {
      id,
      title,
      slug,
      content,
      cover_image,
      coverImage,
      cover_image_alt,
      coverImageAlt,
      is_featured,
      isFeatured,
      status,
      tags,
      author,
      author_id,
      excerpt,
      read_time,
      readTime,
      scheduled_at,
      scheduledAt,
      meta_title,
      metaTitle,
      meta_description,
      metaDescription,
      meta_keywords,
      metaKeywords,
    } = body

    // 2. Validate ID
    if (!id) {
      console.error('[PUT /api/posts] ERROR: Post id is required but not provided')
      return NextResponse.json({ message: 'Post id is required' }, { status: 400 })
    }

    // 3. Build updates object
    const updates: Record<string, unknown> = {
      title,
      slug,
      content,
      cover_image: cover_image ?? coverImage ?? null,
      is_featured: Boolean(is_featured ?? isFeatured),
      status: status ?? 'draft',
      tags: normalizeTags(tags),
      updated_at: new Date().toISOString(),
    }

    if (typeof author === 'string' && author.trim()) updates.author = author.trim()
    if (typeof excerpt === 'string' && excerpt.trim()) updates.excerpt = excerpt.trim()

    const suppliedReadTime =
      typeof read_time === 'number'
        ? read_time
        : typeof readTime === 'number'
          ? readTime
          : null

    if (suppliedReadTime) {
      updates.read_time = Math.max(1, Math.round(suppliedReadTime))
    }

    if (cover_image_alt !== undefined || coverImageAlt !== undefined) {
      updates.cover_image_alt = cover_image_alt ?? coverImageAlt ?? null
    }

    if (scheduled_at !== undefined || scheduledAt !== undefined) {
      updates.scheduled_at = scheduled_at ?? scheduledAt ?? null
    }

    if (meta_title !== undefined || metaTitle !== undefined) {
      updates.meta_title = meta_title ?? metaTitle ?? null
    }

    if (meta_description !== undefined || metaDescription !== undefined) {
      updates.meta_description = meta_description ?? metaDescription ?? null
    }

    if (meta_keywords !== undefined || metaKeywords !== undefined) {
      updates.meta_keywords = meta_keywords ?? metaKeywords ?? null
    }

    if (author_id) updates.author_id = author_id

    console.log('[PUT /api/posts] Final updates object:', JSON.stringify(updates, null, 2))

    // 4. Execute update (with required `.select().single()`)
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle() // <-- allow 0 rows without throwing Supabase errors

    // 5. Handle Supabase errors
    if (error) {
      console.error('[PUT /api/posts] ========== SUPABASE ERROR ==========')
      console.error('[PUT /api/posts] Error:', JSON.stringify(error, null, 2))

      // Handle PGRST116: "Cannot coerce result to single JSON object"
      if (
        error.code === 'PGRST116' ||
        (error.details && error.details.includes('0 rows'))
      ) {
        return NextResponse.json(
          { message: 'Post not found', id },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          message: 'Error updating post',
          error: error.message,
          details: {
            code: error.code,
            hint: error.hint,
            details: error.details,
          },
        },
        { status: 500 }
      )
    }

    // 6. If update returned no row → post doesn't exist
    if (!data) {
      console.error('[PUT /api/posts] No post found to update with id:', id)
      return NextResponse.json(
        { message: 'Post not found', id },
        { status: 404 }
      )
    }

    console.log('[PUT /api/posts] Post updated successfully:', data.id)

    // 7. Revalidate cache
    try {
      revalidatePath('/')
      revalidatePath('/blog')
      revalidateTag('homepage-posts')
      revalidateTag('published-posts')
    } catch (revalidationError) {
      console.warn('[PUT /api/posts] Cache revalidation error:', revalidationError)
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('[PUT /api/posts] Unexpected Error:', error)
    return NextResponse.json(
      {
        message: 'Error updating post',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { id, is_featured, isFeatured, status, visibility, scheduled_at, scheduledAt } = body

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
    if (scheduled_at !== undefined) {
      updates.scheduled_at = scheduled_at
    } else if (scheduledAt !== undefined) {
      updates.scheduled_at = scheduledAt
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update' }, { status: 400 })
    }

    const { data, error } = await supabase.from('posts').update(updates).eq('id', id).select().single()

    if (error) {
      console.error('Error updating post:', error)
      return NextResponse.json({ message: 'Error updating post', error: error.message }, { status: 500 })
    }

    // Clear Next.js cache for relevant routes
    try {
      // Revalidate the homepage which contains the blog section
      revalidatePath('/');
      revalidatePath('/blog');
      revalidateTag('homepage-posts');
      revalidateTag('published-posts');
    } catch (revalidationError) {
      console.warn('Error during cache revalidation:', revalidationError);
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
    const supabase = createAdminClient()
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ message: 'Post id is required' }, { status: 400 })
    }

    const { error } = await supabase.from('posts').delete().eq('id', id)

    if (error) {
      console.error('Error deleting post:', error)
      return NextResponse.json({ message: 'Error deleting post', error: error.message }, { status: 500 })
    }

    // Clear Next.js cache for relevant routes
    try {
      // Revalidate the homepage which contains the blog section
      revalidatePath('/');
      revalidatePath('/blog');
      revalidateTag('homepage-posts');
      revalidateTag('published-posts');
    } catch (revalidationError) {
      console.warn('Error during cache revalidation:', revalidationError);
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
