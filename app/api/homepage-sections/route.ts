import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/require-admin'

// GET - Fetch homepage sections
export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get('scope') ?? 'public'
    const supabase = await createClient(scope === 'admin')

    let query = supabase
      .from('homepage_sections')
      .select('*')
      .order('order_position', { ascending: true })

    // Public endpoint only shows active sections
    if (scope !== 'admin') {
      query = query.eq('is_active', true).eq('visibility', 'public')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching homepage sections:', error)
      return NextResponse.json(
        { message: 'Failed to fetch homepage sections', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('Error in homepage-sections GET:', error)
    return NextResponse.json(
      { message: 'Failed to fetch homepage sections', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new homepage section (Admin only)
export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = await createClient(true)
    const body = await req.json()

    const {
      section_key,
      title,
      subtitle,
      content,
      images,
      cta_text,
      cta_url,
      order_position,
      is_active,
      visibility,
      metadata
    } = body

    if (!section_key) {
      return NextResponse.json(
        { message: 'section_key is required' },
        { status: 400 }
      )
    }

    const payload: Record<string, unknown> = {
      section_key,
      title: title || null,
      subtitle: subtitle || null,
      content: content || {},
      images: images || [],
      cta_text: cta_text || null,
      cta_url: cta_url || null,
      order_position: order_position || 0,
      is_active: is_active !== undefined ? is_active : true,
      visibility: visibility || 'public',
      metadata: metadata || {}
    }

    const { data, error } = await supabase
      .from('homepage_sections')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error('Error creating homepage section:', error)
      return NextResponse.json(
        { message: 'Failed to create homepage section', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in homepage-sections POST:', error)
    return NextResponse.json(
      { message: 'Failed to create homepage section', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update homepage section (Admin only)
export async function PUT(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = await createClient(true)
    const body = await req.json()

    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { message: 'Section id is required' },
        { status: 400 }
      )
    }

    const allowedFields = [
      'section_key',
      'title',
      'subtitle',
      'content',
      'images',
      'cta_text',
      'cta_url',
      'order_position',
      'is_active',
      'visibility',
      'metadata'
    ]

    const payload: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in updates) {
        payload[field] = updates[field]
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('homepage_sections')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating homepage section:', error)
      return NextResponse.json(
        { message: 'Failed to update homepage section', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in homepage-sections PUT:', error)
    return NextResponse.json(
      { message: 'Failed to update homepage section', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update (toggle active, reorder, etc.) (Admin only)
export async function PATCH(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = await createClient(true)
    const body = await req.json()

    const { id, is_active, visibility, order_position } = body

    if (!id) {
      return NextResponse.json(
        { message: 'Section id is required' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}

    if (typeof is_active === 'boolean') {
      updates.is_active = is_active
    }

    if (typeof visibility === 'string') {
      updates.visibility = visibility
    }

    if (typeof order_position === 'number') {
      updates.order_position = order_position
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('homepage_sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error patching homepage section:', error)
      return NextResponse.json(
        { message: 'Failed to update homepage section', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in homepage-sections PATCH:', error)
    return NextResponse.json(
      { message: 'Failed to update homepage section', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove homepage section (Admin only)
export async function DELETE(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = await createClient(true)
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json(
        { message: 'Section id is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('homepage_sections')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting homepage section:', error)
      return NextResponse.json(
        { message: 'Failed to delete homepage section', error: error.message },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in homepage-sections DELETE:', error)
    return NextResponse.json(
      { message: 'Failed to delete homepage section', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
