import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ADMIN_EMAILS = ['nwosupaul3@gmail.com']

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate email is authorized
    if (!ALLOWED_ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: 'Not authorized for admin role' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      // Update existing profile to admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          email: email,
          Email: email,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.json({ error: `Failed to update profile: ${updateError.message}` }, { status: 500 })
      }
    } else {
      // Create new profile using service role (bypasses RLS)
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          user_id: userId,
          email: email,
          Email: email,
          role: 'admin',
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Profile creation error:', insertError)
        return NextResponse.json({ error: `Failed to create profile: ${insertError.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Set admin API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
