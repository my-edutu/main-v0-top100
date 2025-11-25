import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

const TARGET_EMAIL = 'nwosupaul3@gmail.com'
const NEW_PASSWORD = 'Top100Admin2025!' // Change this to your preferred password

async function resetPassword() {
  console.log('🔐 Resetting password for:', TARGET_EMAIL)
  console.log('='.repeat(60))

  try {
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error listing users:', listError)
      return
    }

    const user = users.users.find(u => u.email === TARGET_EMAIL)

    if (!user) {
      console.error('❌ User not found')
      return
    }

    console.log('✅ User found')
    console.log('   User ID:', user.id)

    // Reset password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: NEW_PASSWORD }
    )

    if (error) {
      console.error('❌ Error resetting password:', error)
      return
    }

    console.log('✅ Password reset successful!')
    console.log('\n' + '='.repeat(60))
    console.log('🎉 NEW LOGIN CREDENTIALS:')
    console.log('='.repeat(60))
    console.log('Email:', TARGET_EMAIL)
    console.log('Password:', NEW_PASSWORD)
    console.log('\n📍 Login URL: http://localhost:3000/auth/signin')
    console.log('\n⚠️  IMPORTANT: Save this password or change it after logging in!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

resetPassword()
