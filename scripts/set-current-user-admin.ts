import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setCurrentUserAdmin() {
  try {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .order('created_at', { ascending: true })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found in the database')
      return
    }

    console.log('Available profiles:')
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.email || 'No email'} (${profile.role}) - ID: ${profile.id}`)
    })

    // Get the first profile and make it admin
    const firstProfile = profiles[0]
    console.log(`\nSetting ${firstProfile.email || 'user'} as admin...`)

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', firstProfile.id)
      .select()

    if (error) {
      console.error('Error updating profile:', error)
      return
    }

    console.log('Success! Profile updated:', data)
    console.log('\nYou can now access the admin blog page.')
  } catch (error) {
    console.error('Error:', error)
  }
}

setCurrentUserAdmin()
