const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function fixProfileId(email) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  const apiKey = serviceRoleKey || anonKey
  const supabase = createClient(supabaseUrl, apiKey)

  try {
    console.log(`🔧 Fixing profile ID for ${email}...`)
    
    // Get user from auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError)
      return false
    }
    
    const authUser = authUsers.users.find(user => user.email === email)
    
    if (!authUser) {
      console.log('❌ User not found in authentication.')
      return false
    }
    
    console.log('✅ Auth User found:', authUser.id)
    
    // Get current profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single()
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError)
      return false
    }
    
    if (!currentProfile) {
      console.log('❌ Profile not found.')
      return false
    }
    
    console.log('📋 Current profile:')
    console.log(`   ID: ${currentProfile.id}`)
    console.log(`   User ID: ${currentProfile.user_id}`)
    console.log(`   Email: ${currentProfile.Email}`)
    console.log(`   Role: ${currentProfile.role}`)
    
    if (currentProfile.id === authUser.id) {
      console.log('✅ Profile ID already matches auth user ID - no fix needed!')
      return true
    }
    
    // Update the profile ID to match auth user ID
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        id: authUser.id,
        email: currentProfile.Email // Also fix lowercase email field
      })
      .eq('user_id', authUser.id)
    
    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      return false
    }
    
    console.log('✅ Profile ID fixed successfully!')
    console.log(`   Old ID: ${currentProfile.id}`)
    console.log(`   New ID: ${authUser.id}`)
    console.log('✅ User should now be able to sign in properly.')
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

const email = process.argv[2]

if (!email) {
  console.error('Usage: node fix-profile-id.js <email>')
  process.exit(1)
}

fixProfileId(email).then(success => {
  console.log(success ? '🎉 Profile fixed successfully!' : '😞 Failed to fix profile')
  process.exit(success ? 0 : 1)
})