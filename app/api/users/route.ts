import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = createClient(true)

    // Fetch all users from profiles table
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { message: 'Error fetching users', error: error.message },
        { status: 500 }
      )
    }

    // Transform profiles to match the User interface expected by the frontend
    const users = profiles.map((profile) => ({
      id: profile.id,
      name: profile.full_name || 'Unnamed User',
      email: profile.email || '',
      role: profile.role || 'user',
      status: profile.is_public === false ? 'inactive' : 'active',
      joinedDate: profile.created_at || new Date().toISOString(),
      lastActive: profile.updated_at || profile.created_at || new Date().toISOString(),
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      location: profile.location,
      headline: profile.headline,
    }))

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error in users GET:', error)
    return NextResponse.json(
      { message: 'Error fetching users', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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
    const { id, role, status, full_name, email, bio, location, headline } = body

    if (!id) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updates: Record<string, any> = {}

    if (role !== undefined) {
      // Validate role
      if (!['admin', 'editor', 'user'].includes(role)) {
        return NextResponse.json(
          { message: 'Invalid role. Must be admin, editor, or user' },
          { status: 400 }
        )
      }
      updates.role = role
    }

    if (status !== undefined) {
      // Map status to is_public
      updates.is_public = status === 'active'
    }

    if (full_name !== undefined) updates.full_name = full_name
    if (email !== undefined) updates.email = email
    if (bio !== undefined) updates.bio = bio
    if (location !== undefined) updates.location = location
    if (headline !== undefined) updates.headline = headline

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update the user
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { message: 'Error updating user', error: error.message },
        { status: 500 }
      )
    }

    // Transform back to frontend format
    const user = {
      id: data.id,
      name: data.full_name || 'Unnamed User',
      email: data.email || '',
      role: data.role || 'user',
      status: data.is_public === false ? 'inactive' : 'active',
      joinedDate: data.created_at || new Date().toISOString(),
      lastActive: data.updated_at || data.created_at || new Date().toISOString(),
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in users PUT:', error)
    return NextResponse.json(
      { message: 'Error updating user', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Don't allow admins to delete themselves
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id === id) {
      return NextResponse.json(
        { message: 'You cannot delete your own account' },
        { status: 403 }
      )
    }

    // Soft delete by setting is_public to false and archiving
    const { error } = await supabase
      .from('profiles')
      .update({ is_public: false, role: 'user' })
      .eq('id', id)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json(
        { message: 'Error deleting user', error: error.message },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in users DELETE:', error)
    return NextResponse.json(
      { message: 'Error deleting user', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
