import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProfiles() {
  console.log('\n🔍 Checking all user profiles...\n')

  // Get all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching profiles:', error.message)
    process.exit(1)
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No profiles found')
    process.exit(0)
  }

  console.log(`📋 Found ${profiles.length} profile(s):\n`)

  profiles.forEach((profile, index) => {
    console.log(`${index + 1}. ${profile.email || '(no email)'}`)
    console.log(`   ID: ${profile.id}`)
    console.log(`   Full Name: ${profile.full_name || '(none)'}`)
    console.log(`   Role: ${profile.role || '(none)'}`)
    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'
    console.log(`   Is Admin: ${isAdmin ? '✅ Yes' : '❌ No'}`)
    console.log('')
  })

  const adminCount = profiles.filter(p => p.role === 'admin' || p.role === 'superadmin').length

  console.log(`\n📊 Summary:`)
  console.log(`   Total profiles: ${profiles.length}`)
  console.log(`   Admin users: ${adminCount}`)

  if (adminCount === 0) {
    console.log('\n⚠️  WARNING: No admin users found!')
    console.log('   You need to set at least one user as admin.')
    console.log('   Use the email shown above and run:')
    console.log('   npm run set-admin <email>')
  }
}

checkProfiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
