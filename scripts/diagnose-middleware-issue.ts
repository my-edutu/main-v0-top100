import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseMiddlewareIssue() {
  console.log('\n🔍 MIDDLEWARE DIAGNOSIS')
  console.log('='.repeat(60))

  const targetEmail = 'nwosupaul3@gmail.com'
  console.log(`\n📧 Checking for user: ${targetEmail}`)

  // 1. Check auth.users
  console.log('\n1️⃣ Checking auth.users table...')
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('❌ Error fetching auth users:', authError)
  } else {
    const targetUser = authUsers.users.find(u => u.email === targetEmail)
    if (targetUser) {
      console.log('✅ Found user in auth.users:')
      console.log('   - ID:', targetUser.id)
      console.log('   - Email:', targetUser.email)
      console.log('   - Created:', targetUser.created_at)
      console.log('   - Last sign in:', targetUser.last_sign_in_at)
    } else {
      console.log('❌ User NOT found in auth.users')
      console.log('   Available users:', authUsers.users.map(u => u.email))
    }
  }

  // 2. Check profiles table
  console.log('\n2️⃣ Checking profiles table...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', targetEmail)

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError)
  } else if (!profiles || profiles.length === 0) {
    console.log('❌ No profile found for this email in profiles table')

    // Check all profiles to see what's there
    console.log('\n   📋 All profiles in database:')
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email, role')
      .order('created_at', { ascending: false })
      .limit(10)

    if (allProfiles) {
      allProfiles.forEach(p => {
        console.log(`      - ${p.email || 'NO EMAIL'} (role: ${p.role || 'NO ROLE'}, id: ${p.id})`)
      })
    }
  } else {
    console.log('✅ Found profile(s):')
    profiles.forEach((profile, index) => {
      console.log(`\n   Profile ${index + 1}:`)
      console.log('   - ID:', profile.id)
      console.log('   - Email:', profile.email || profile.Email || 'NOT SET')
      console.log('   - Role:', profile.role || 'NOT SET ❌')
      console.log('   - Full Name:', profile.full_name || 'NOT SET')
      console.log('   - Created:', profile.created_at)
    })
  }

  // 3. Try to find profile by ID from auth
  if (authUsers && authUsers.users.length > 0) {
    const targetUser = authUsers.users.find(u => u.email === targetEmail)
    if (targetUser) {
      console.log('\n3️⃣ Checking profiles table by ID from auth.users...')
      const { data: profileById, error: profileByIdError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUser.id)
        .maybeSingle()

      if (profileByIdError) {
        console.error('❌ Error fetching profile by ID:', profileByIdError)
      } else if (!profileById) {
        console.log('❌ No profile found with ID:', targetUser.id)
        console.log('\n   ⚠️  ISSUE FOUND: Profile does not exist for this auth user!')
        console.log('   This is why the middleware is failing.')
      } else {
        console.log('✅ Found profile by ID:')
        console.log('   - ID:', profileById.id)
        console.log('   - Email:', profileById.email || profileById.Email || 'NOT SET')
        console.log('   - Role:', profileById.role || 'NOT SET ❌')

        if (profileById.role !== 'admin') {
          console.log('\n   ⚠️  ISSUE FOUND: Role is not "admin"!')
          console.log('   Current role:', profileById.role || 'null')
          console.log('   This is why the middleware is blocking access.')
        } else {
          console.log('\n   ✅ Role is correctly set to "admin"')
          console.log('   The middleware should allow access.')
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🔍 DIAGNOSIS COMPLETE\n')
}

diagnoseMiddlewareIssue().catch(console.error)
