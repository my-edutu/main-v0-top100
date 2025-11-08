import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Use service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Query profile using service role (bypasses RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email, Email, username, display_name')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Profile query error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Validate role
    if (profile.role !== 'admin' && profile.role !== 'user') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 })
    }

    return NextResponse.json({ 
      profile: {
        role: profile.role,
        email: profile.email || profile.Email,
        username: profile.username,
        display_name: profile.display_name
      }
    })

  } catch (error) {
    console.error('Check profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}