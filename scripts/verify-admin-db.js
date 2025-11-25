/**
 * Quick script to verify admin role in database
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function verify() {
  console.log('\n🔍 Checking database for admin role...\n')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, Email, role')
    .eq('email', 'nwosupaul3@gmail.com')
    .maybeSingle()

  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  if (!data) {
    console.log('❌ No profile found for nwosupaul3@gmail.com')
    console.log('\n🔧 Run this to fix:')
    console.log('   curl -X POST http://localhost:3000/api/profiles/fix-admin \\')
    console.log('     -H "Content-Type: application/json" \\')
    console.log('     -d \'{"email":"nwosupaul3@gmail.com"}\'')
    return
  }

  console.log('✅ Profile found!')
  console.log(`   Email: ${data.email || data.Email}`)
  console.log(`   Role: ${data.role}`)
  console.log(`   ID: ${data.id}`)

  if (data.role === 'admin') {
    console.log('\n✅ ✅ ✅ YOU HAVE ADMIN ROLE! ✅ ✅ ✅')
    console.log('\n📍 Next steps:')
    console.log('   1. Sign out completely')
    console.log('   2. Clear browser cookies')
    console.log('   3. Sign in again')
    console.log('   4. Check terminal logs when accessing /admin')
  } else {
    console.log('\n❌ Role is NOT admin!')
    console.log('\n🔧 Fix it by navigating to:')
    console.log('   http://localhost:3000/auth/fix-admin')
  }
}

verify()
