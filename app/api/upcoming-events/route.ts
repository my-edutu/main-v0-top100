import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/require-admin'

// GET - Fetch upcoming events
export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get('scope') ?? 'public'
    const limit = req.nextUrl.searchParams.get('limit')
    const featured = req.nextUrl.searchParams.get('featured')
    const supabase = await createClient(scope === 'admin')

    let query = supabase
      .from('upcoming_events')
      .select('*')
      .order('event_date', { ascending: true })

    // Public endpoint only shows active events and future events
    if (scope !== 'admin') {
      query = query
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString())
    }

    // Filter by featured if requested
    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }

    // Limit results if specified
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching upcoming events:', error)
      return NextResponse.json(
        { message: 'Failed to fetch upcoming events', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('Error in upcoming-events GET:', error)
    return NextResponse.json(
      { message: 'Failed to fetch upcoming events', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new upcoming event (Admin only)
export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = await createClient(true)
    const body = await req.json()

    const {
      title,
      description,
      event_date,
      end_date,
      location,
      event_type,
      image_url,
      registration_url,
      is_featured,
      is_active,
      max_attendees,
      current_attendees,
      tags,
      metadata,
      order_position
    } = body

    if (!title || !event_date) {
      return NextResponse.json(
        { message: 'title and event_date are required' },
        { status: 400 }
      )
    }

    const payload: Record<string, unknown> = {
      title,
      description: description || null,
      event_date,
      end_date: end_date || null,
      location: location || null,
      event_type: event_type || 'conference',
      image_url: image_url || null,
      registration_url: registration_url || null,
      is_featured: is_featured !== undefined ? is_featured : false,
      is_active: is_active !== undefined ? is_active : true,
      max_attendees: max_attendees || null,
      current_attendees: current_attendees || 0,
      tags: tags || [],
      metadata: metadata || {},
      order_position: order_position || 0
    }

    const { data, error } = await supabase
      .from('upcoming_events')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error('Error creating upcoming event:', error)
      return NextResponse.json(
        { message: 'Failed to create upcoming event', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in upcoming-events POST:', error)
    return NextResponse.json(
      { message: 'Failed to create upcoming event', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update upcoming event (Admin only)
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
        { message: 'Event id is required' },
        { status: 400 }
      )
    }

    const allowedFields = [
      'title',
      'description',
      'event_date',
      'end_date',
      'location',
      'event_type',
      'image_url',
      'registration_url',
      'is_featured',
      'is_active',
      'max_attendees',
      'current_attendees',
      'tags',
      'metadata',
      'order_position'
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
      .from('upcoming_events')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating upcoming event:', error)
      return NextResponse.json(
        { message: 'Failed to update upcoming event', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in upcoming-events PUT:', error)
    return NextResponse.json(
      { message: 'Failed to update upcoming event', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update (toggle featured/active, etc.) (Admin only)
export async function PATCH(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = await createClient(true)
    const body = await req.json()

    const { id, is_active, is_featured, order_position } = body

    if (!id) {
      return NextResponse.json(
        { message: 'Event id is required' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}

    if (typeof is_active === 'boolean') {
      updates.is_active = is_active
    }

    if (typeof is_featured === 'boolean') {
      updates.is_featured = is_featured
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
      .from('upcoming_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error patching upcoming event:', error)
      return NextResponse.json(
        { message: 'Failed to update upcoming event', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in upcoming-events PATCH:', error)
    return NextResponse.json(
      { message: 'Failed to update upcoming event', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove upcoming event (Admin only)
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
        { message: 'Event id is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('upcoming_events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting upcoming event:', error)
      return NextResponse.json(
        { message: 'Failed to delete upcoming event', error: error.message },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in upcoming-events DELETE:', error)
    return NextResponse.json(
      { message: 'Failed to delete upcoming event', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
