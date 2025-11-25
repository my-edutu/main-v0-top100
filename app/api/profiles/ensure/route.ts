import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Ensure a user profile exists in the database.
 * This endpoint is used to sync auth users with profile records.
 *
 * BUG FIX: Now uses the centralized requireAdmin guard.
 * Previously returned 503 "authentication disabled".
 */
export async function POST(request: NextRequest) {
  // Require admin access
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  try {
    const body = await request.json()
    const { userId, email } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Use service role client to ensure profile
    const supabase = await createClient(true)

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      console.log('[profiles/ensure] Profile already exists:', existingProfile)
      return NextResponse.json({
        message: 'Profile already exists',
        profile: existingProfile,
      })
    }

    // Create profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email || null,
        role: 'user', // Default role
        full_name: null,
        avatar_url: null,
      })
      .select()
      .single()

    if (createError) {
      console.error('[profiles/ensure] Error creating profile:', createError)
      return NextResponse.json(
        { error: 'Failed to create profile', details: createError.message },
        { status: 500 }
      )
    }

    console.log('[profiles/ensure] Profile created successfully:', newProfile)
    return NextResponse.json({
      message: 'Profile created successfully',
      profile: newProfile,
    })
  } catch (error) {
    console.error('[profiles/ensure] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
