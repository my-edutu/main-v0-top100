const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function setAdminPassword() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'Set' : 'MISSING')
    return false
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const email = 'nwosupaul3@gmail.com'
  const password = 'Admin@Top100' // Strong temporary password

  try {
    console.log(`🔐 Setting password for ${email}...`)
    console.log('='.repeat(60))

    // Get user from auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error listing auth users:', authError.message)
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
      console.error('❌ Error updating password:', updateError.message)
      return false
    }

    console.log('✅ Password updated successfully!')
    console.log('='.repeat(60))
    console.log('🎉 You can now login with:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log('='.repeat(60))
    console.log('⚠️  Please change this password after first login!')
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

setAdminPassword().then(success => {
  process.exit(success ? 0 : 1)
})
