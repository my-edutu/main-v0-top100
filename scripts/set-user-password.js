const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function setUserPassword(email, password) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  const apiKey = serviceRoleKey || anonKey
  const supabase = createClient(supabaseUrl, apiKey)

  try {
    console.log(`🔐 Setting password for ${email}...`)
    
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
    
    console.log('✅ User found:', authUser.id)
    
    // Update user password
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { password: password }
    )

    if (updateError) {
      console.error('❌ Error updating password:', updateError)
      return false
    }

    console.log('✅ Password updated successfully!')
    console.log('User can now login with:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: node set-user-password.js <email> <password>')
  process.exit(1)
}

setUserPassword(email, password).then(success => {
  console.log(success ? '🎉 Password set successfully!' : '😞 Failed to set password')
  process.exit(success ? 0 : 1)
})