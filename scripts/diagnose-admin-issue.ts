// Script to diagnose admin access issues
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

async function diagnoseAdminIssue() {
  console.log('🔍 Starting admin access diagnosis...\n')

  const targetEmail = 'nwouspaul3@gmail.com'

  // 1. Check if user exists in auth.users
  console.log('1️⃣ Checking auth.users table...')
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('❌ Error listing users:', authError.message)
    return
  }

  const user = authData.users.find(u => u.email === targetEmail)

  if (!user) {
    console.error(`❌ User ${targetEmail} not found in auth.users`)
    console.log('\n💡 Solution: User needs to sign up first')
    return
  }

  console.log('✅ User found in auth.users')
  console.log('   User ID:', user.id)
  console.log('   Email:', user.email)
  console.log('   Email confirmed:', user.email_confirmed_at ? '✓ Yes' : '✗ No')
  console.log('   Created at:', user.created_at)
  console.log('')

  // 2. Check if profile exists
  console.log('2️⃣ Checking profiles table...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('❌ Error querying profiles:', profileError.message)
    return
  }

  if (!profile) {
    console.error('❌ Profile not found for user')
    console.log('\n💡 Solution: Profile needs to be created')
    console.log('\n🔧 Creating profile now...')

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        role: 'admin',
        full_name: user.user_metadata?.full_name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating profile:', createError.message)
      return
    }

    console.log('✅ Profile created successfully')
    console.log('   Role:', newProfile.role)
    return
  }

  console.log('✅ Profile exists')
  console.log('   Profile ID:', profile.id)
  console.log('   Email:', profile.email)
  console.log('   Role:', profile.role)
  console.log('   Full name:', profile.full_name || '(not set)')
  console.log('')

  // 3. Check admin role
  console.log('3️⃣ Checking admin role...')

  if (profile.role !== 'admin') {
    console.error(`❌ User role is '${profile.role}' but should be 'admin'`)
    console.log('\n💡 Solution: Update role to admin')
    console.log('\n🔧 Updating role now...')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating role:', updateError.message)
      return
    }

    console.log('✅ Role updated to admin')
    return
  }

  console.log('✅ User has admin role')
  console.log('')

  // 4. Test RLS policies
  console.log('4️⃣ Testing RLS policies...')

  // Create a client with the user's auth
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: targetEmail,
  })

  if (sessionError) {
    console.error('❌ Error generating magic link:', sessionError.message)
  } else {
    console.log('✅ Can generate authentication links for user')
  }

  console.log('')

  // 5. Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ User exists: ${user.email}`)
  console.log(`✅ Profile exists: ${profile.id}`)
  console.log(`✅ Role is admin: ${profile.role === 'admin' ? 'Yes' : 'No'}`)
  console.log('')

  if (profile.role === 'admin') {
    console.log('✅ Everything looks good! If you\'re still getting "Admin access required":')
    console.log('')
    console.log('Possible issues:')
    console.log('1. Session cookies may be corrupted - try signing out and back in')
    console.log('2. Browser cache issue - clear cookies for localhost')
    console.log('3. Middleware might not be passing session correctly')
    console.log('4. Service role key might not be set in production environment')
    console.log('')
    console.log('Next steps:')
    console.log('1. Sign out completely from the application')
    console.log('2. Clear browser cookies for your domain')
    console.log('3. Sign back in with ' + targetEmail)
    console.log('4. Try accessing admin dashboard again')
  }
}

diagnoseAdminIssue()
  .then(() => {
    console.log('\n✅ Diagnosis complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Diagnosis failed:', error)
    process.exit(1)
  })
