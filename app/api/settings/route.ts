import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createClient } from '@/lib/supabase/server'

type SiteSettings = {
  id?: string
  site_name: string
  site_description: string
  site_url: string
  contact_email: string
  social_links: {
    twitter?: string
    linkedin?: string
    instagram?: string
    facebook?: string
    youtube?: string
  }
  registration_enabled: boolean
  newsletter_enabled: boolean
  maintenance_mode: boolean
  updated_at?: string
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'Top100 Africa Future Leaders',
  site_description: "Showcasing Africa's emerging leaders",
  site_url: 'https://top100afl.org',
  contact_email: 'admin@top100afl.org',
  social_links: {
    twitter: 'https://twitter.com/top100afl',
    linkedin: 'https://linkedin.com/company/top100afl',
    instagram: 'https://instagram.com/top100afl',
  },
  registration_enabled: true,
  newsletter_enabled: true,
  maintenance_mode: false,
}

// Ensure the site_settings table exists
async function ensureSettingsTable(supabase: ReturnType<typeof createClient>) {
  try {
    // Try to fetch settings first to check if table exists
    const { error: fetchError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .maybeSingle()

    // If table doesn't exist, create it using raw SQL
    if (fetchError && fetchError.message.includes('relation "site_settings" does not exist')) {
      console.log('Creating site_settings table...')

      const { error: createError } = await supabase.rpc('create_site_settings_table', {})

      if (createError) {
        console.warn('Could not create table via RPC, trying alternative approach:', createError.message)
        // Table might not exist yet, but we'll handle it in the insert
      }
    }
  } catch (error) {
    console.warn('Error checking/creating settings table:', error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(true)

    // Ensure table exists
    await ensureSettingsTable(supabase)

    // Try to fetch settings
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching settings:', error)

      // If table doesn't exist, return default settings
      if (error.message.includes('relation "site_settings" does not exist')) {
        return NextResponse.json(DEFAULT_SETTINGS)
      }

      return NextResponse.json(
        { message: 'Error fetching settings', error: error.message },
        { status: 500 }
      )
    }

    // If no settings exist, return defaults
    if (!data) {
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in settings GET:', error)
    return NextResponse.json(
      { message: 'Error fetching settings', error: error instanceof Error ? error.message : 'Unknown error' },
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

    // Validate required fields
    if (!body.site_name || !body.site_url || !body.contact_email) {
      return NextResponse.json(
        { message: 'Missing required fields: site_name, site_url, contact_email' },
        { status: 400 }
      )
    }

    // Ensure table exists
    await ensureSettingsTable(supabase)

    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .maybeSingle()

    const payload: Partial<SiteSettings> = {
      site_name: body.site_name,
      site_description: body.site_description || '',
      site_url: body.site_url,
      contact_email: body.contact_email,
      social_links: body.social_links || {},
      registration_enabled: Boolean(body.registration_enabled),
      newsletter_enabled: Boolean(body.newsletter_enabled),
      maintenance_mode: Boolean(body.maintenance_mode),
    }

    let result

    if (existingSettings?.id) {
      // Update existing settings
      const { data, error } = await supabase
        .from('site_settings')
        .update(payload)
        .eq('id', existingSettings.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('site_settings')
        .insert([payload])
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in settings PUT:', error)
    return NextResponse.json(
      { message: 'Error updating settings', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
