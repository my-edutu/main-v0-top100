const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function makeUserAdminCorrect(email) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  const apiKey = serviceRoleKey || anonKey
  const supabase = createClient(supabaseUrl, apiKey)

  try {
    console.log(`🔍 Making ${email} an admin...`)
    
    // Get user from auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError)
      return false
    }
    
    const authUser = authUsers.users.find(user => user.email === email)
    
    if (!authUser) {
      console.log('❌ User not found in authentication. They need to sign up first.')
      return false
    }
    
    console.log('✅ User found in auth:', authUser.id)
    
    // Based on the errors, it seems like we need Email (capital E) and the role column is lowercase
    // Let's try the correct combination
    const profileData = {
      user_id: authUser.id,
      Email: authUser.email,  // Capital E based on error message
      role: 'admin'  // lowercase role based on schema
    }
    
    console.log('🔄 Attempting to insert profile...')
    console.log('Data:', profileData)
    
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()

    if (insertError) {
      console.error('❌ Error inserting profile:', insertError)
      return false
    } else {
      console.log('✅ Profile created successfully!')
      console.log('Profile data:', insertData)
      return true
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

const email = process.argv[2]

if (!email) {
  console.error('Usage: node make-admin-correct.js <email>')
  process.exit(1)
}

makeUserAdminCorrect(email).then(success => {
  console.log(success ? '🎉 Admin role granted successfully!' : '😞 Failed to grant admin role')
  process.exit(success ? 0 : 1)
})