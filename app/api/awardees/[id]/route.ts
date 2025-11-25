// app/api/awardees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/require-admin'

// GET - Retrieve specific awardee by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const id = params.id

    const supabase = await createClient(true) // Use service role

    const { data, error } = await supabase
      .from('awardees')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching awardee:', error)
      return NextResponse.json(
        { message: 'Failed to fetch awardee', error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { message: 'Awardee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in awardees GET:', error)
    return NextResponse.json(
      { message: 'Failed to fetch awardee', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH - Update specific fields of an awardee (for toggling featured, visibility, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const id = params.id
    const body = await request.json()

    const supabase = await createClient(true) // Use service role

    const updates: Record<string, unknown> = {}

    // Allow updating featured status
    if (typeof body.featured === 'boolean') {
      updates.featured = body.featured
    }

    // Allow updating is_public status
    if (typeof body.is_public === 'boolean') {
      updates.is_public = body.is_public
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('awardees')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating awardee:', error)
      return NextResponse.json(
        { message: 'Failed to update awardee', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in awardees PATCH:', error)
    return NextResponse.json(
      { message: 'Failed to update awardee', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
