import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const supabase = createAdminClient()

    // Fetch all users from profiles table
    const profiles = []
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('account_status', 'deleted')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(offset, offset + 999)
      if (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json({ message: 'Could not load users.' }, { status: 500 })
      }
      profiles.push(...(data ?? []))
      if ((data ?? []).length < 1000) break
    }

    // Transform profiles to match the User interface expected by the frontend
    const users = profiles.map((profile) => ({
      id: profile.id,
      name: profile.full_name || 'Unnamed User',
      email: profile.email || '',
      role: profile.role || 'user',
      status: profile.account_status === 'suspended' ? 'inactive' : 'active',
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
    const supabase = createAdminClient()
    const body = await req.json()
    const { id, role, status, full_name, email, bio, location, headline } = body

    if (!id) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    if (
      id === adminCheck.user.id &&
      (status === 'inactive' || (role !== undefined && role !== adminCheck.profile.role))
    ) {
      return NextResponse.json({ message: 'You cannot suspend or demote your own administrator account.' }, { status: 403 })
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
      if (status !== 'active' && status !== 'inactive') {
        return NextResponse.json({ message: 'Invalid account status.' }, { status: 400 })
      }
      updates.account_status = status === 'inactive' ? 'suspended' : 'active'
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

    // Revoke refresh access at the identity provider, independently of directory visibility.
    if (status !== undefined) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: status === 'inactive' ? '876000h' : 'none',
      })
      if (authError) {
        console.error('Could not change authentication status:', authError)
        return NextResponse.json({ message: 'Could not change authentication status.' }, { status: 503 })
      }
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
      status: data.account_status === 'suspended' ? 'inactive' : 'active',
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
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Compare against the authenticated requesting admin, not the service client.
    if (adminCheck.user.id === id) {
      return NextResponse.json(
        { message: 'You cannot delete your own account' },
        { status: 403 }
      )
    }

    // Preserve historical payments and submissions while revoking account access.
    const { error: banError } = await supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' })
    if (banError) {
      return NextResponse.json({ message: 'Could not revoke account access.' }, { status: 503 })
    }
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: 'deleted', role: 'user' })
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

