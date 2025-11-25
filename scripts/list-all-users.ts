// Script to list all users in the system
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

async function listAllUsers() {
  console.log('🔍 Listing all users in the system...\n')

  // List all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('❌ Error listing users:', authError.message)
    return
  }

  console.log(`📊 Found ${authData.users.length} user(s) in auth.users:\n`)

  for (const user of authData.users) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('User ID:', user.id)
    console.log('Email:', user.email)
    console.log('Email confirmed:', user.email_confirmed_at ? '✓ Yes' : '✗ No')
    console.log('Created at:', user.created_at)
    console.log('Last sign in:', user.last_sign_in_at || 'Never')

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.log('Profile:', '❌ Error -', profileError.message)
    } else if (!profile) {
      console.log('Profile:', '❌ Not found')
    } else {
      console.log('Profile:', '✓ Exists')
      console.log('Role:', profile.role)
      console.log('Full name:', profile.full_name || '(not set)')
    }
    console.log('')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

listAllUsers()
  .then(() => {
    console.log('✅ Complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
