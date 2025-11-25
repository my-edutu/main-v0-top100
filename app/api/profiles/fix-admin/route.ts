import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ADMIN_EMAILS = ['nwosupaul3@gmail.com']

/**
 * This endpoint fixes admin access by updating an existing profile
 * Use this when you get "duplicate key" error during admin setup
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email is authorized
    if (!ALLOWED_ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({
        error: 'Not authorized for admin role',
        message: `Only these emails are allowed: ${ALLOWED_ADMIN_EMAILS.join(', ')}`
      }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Find the profile by email
    const { data: existingProfile, error: findError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle()

    if (findError) {
      console.error('Profile search error:', findError)
      return NextResponse.json({
        error: `Failed to find profile: ${findError.message}`
      }, { status: 500 })
    }

    if (!existingProfile) {
      return NextResponse.json({
        error: 'No profile found with this email',
        message: 'Please create an account first at /auth/signup'
      }, { status: 404 })
    }

    // Check if already admin
    if (existingProfile.role === 'admin') {
      return NextResponse.json({
        success: true,
        message: 'This profile already has admin role!',
        profile: existingProfile
      })
    }

    // Update the profile to admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('email', email)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({
        error: `Failed to update profile: ${updateError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated to admin successfully!',
      profile: {
        id: existingProfile.id,
        email: email,
        role: 'admin'
      }
    })

  } catch (error) {
    console.error('Fix admin API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
