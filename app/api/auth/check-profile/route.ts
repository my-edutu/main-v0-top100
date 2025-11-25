import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { normalizeRole } from '@/lib/auth-utils'

/**
 * Debug endpoint to check profile and role information.
 * Returns both JWT token data and database profile data.
 *
 * BUG FIX: This endpoint helps debug the "can view but cannot act" bug by:
 * 1. Showing the actual JWT token payload being sent to the server
 * 2. Comparing JWT role with database role
 * 3. Identifying token staleness issues
 *
 * USAGE:
 *   POST /api/auth/check-profile
 *   Body: { userId: "uuid" }
 *
 * Returns:
 *   - profile: Database profile data
 *   - jwtData: Decoded JWT token data
 *   - roleMismatch: Whether JWT role differs from DB role
 *   - recommendation: What action to take if there's a mismatch
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // STEP 1: Get server-side session (JWT data)
    const serverSession = await getServerSession(request)

    const jwtData = serverSession
      ? {
          userId: serverSession.user.id,
          email: serverSession.user.email,
          role: serverSession.user.role,
          user_metadata: serverSession.user.user_metadata,
          app_metadata: serverSession.user.app_metadata,
          hasToken: !!serverSession.token,
          tokenPreview: serverSession.token ? `${serverSession.token.substring(0, 20)}...` : null,
        }
      : null

    console.log('[check-profile] JWT data:', jwtData)

    // STEP 2: Get database profile (using service role to bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[check-profile] Missing Supabase configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email, Email, username, display_name, full_name, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[check-profile] Profile query error:', profileError)
      return NextResponse.json(
        {
          error: 'Profile not found',
          jwtData,
          debug: { profileError: profileError.message },
        },
        { status: 404 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        {
          error: 'Profile not found',
          jwtData,
        },
        { status: 404 }
      )
    }

    // STEP 3: Compare JWT role with DB role
    const dbRole = normalizeRole(profile.role)
    const jwtRole = jwtData?.role || null

    const roleMismatch = jwtRole !== dbRole

    console.log('[check-profile] Role comparison:', {
      jwtRole,
      dbRole,
      roleMismatch,
    })

    // STEP 4: Build response with debugging information
    const response = {
      profile: {
        role: profile.role,
        email: profile.email || profile.Email,
        username: profile.username,
        display_name: profile.display_name,
        full_name: profile.full_name,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      jwtData,
      debug: {
        roleMismatch,
        jwtRole,
        dbRole,
        recommendation: roleMismatch
          ? '⚠️  Role mismatch detected! User should sign out and sign in again to refresh their JWT token.'
          : '✅ JWT role matches database role.',
        tokenAge: jwtData
          ? 'Check token exp claim to see if token is stale'
          : 'No JWT token found in request',
      },
    }

    // Validate role
    if (profile.role !== 'admin' && profile.role !== 'user' && profile.role !== 'superadmin' && profile.role !== 'editor') {
      return NextResponse.json(
        {
          ...response,
          error: 'Invalid role in database',
          debug: {
            ...response.debug,
            hint: `Database role "${profile.role}" is not recognized. Expected: admin, superadmin, editor, or user`,
          },
        },
        { status: 403 }
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[check-profile] API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
