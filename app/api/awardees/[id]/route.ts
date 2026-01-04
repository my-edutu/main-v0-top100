// app/api/awardees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/require-admin'

// GET - Retrieve specific awardee by ID
// Public access allowed for self-service editing (returns limited data)
// Admin access returns full data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const { searchParams } = new URL(request.url)
    const adminMode = searchParams.get('admin') === 'true'

    // If admin mode, require admin auth
    if (adminMode) {
      const adminCheck = await requireAdmin(request)
      if ('error' in adminCheck) {
        return adminCheck.error
      }
    }

    const supabase = createAdminClient()

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

    // For non-admin requests, mask sensitive data
    // We allow fetching even if is_public is false for self-service editing
    if (!adminMode) {
      const { email, personal_email, ...safeData } = data
      return NextResponse.json(safeData)
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
