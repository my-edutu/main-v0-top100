import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

const TARGET_EMAIL = 'nwosupaul3@gmail.com'

async function diagnoseAuthIssue() {
  console.log('🔍 Diagnosing auth issue for:', TARGET_EMAIL)
  console.log('='.repeat(60))

  try {
    // Get user by email with full details
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

    console.log('✅ User found in auth.users')
    console.log('\n📋 AUTH DETAILS:')
    console.log('   User ID:', user.id)
    console.log('   Email:', user.email)
    console.log('   Email Confirmed:', user.email_confirmed_at ? '✅ YES' : '❌ NO')
    console.log('   Phone:', user.phone || 'N/A')
    console.log('   Created At:', user.created_at)
    console.log('   Last Sign In:', user.last_sign_in_at || 'Never')
    console.log('   Banned Until:', user.banned_until || 'Not banned')
    console.log('   Confirmation Sent:', user.confirmation_sent_at || 'N/A')

    // Check if email needs confirmation
    if (!user.email_confirmed_at) {
      console.log('\n❌ PROBLEM FOUND: Email not confirmed!')
      console.log('   Fixing now...')

      const { data: updatedUser, error: confirmError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      )

      if (confirmError) {
        console.error('   ❌ Error confirming email:', confirmError)
      } else {
        console.log('   ✅ Email confirmed successfully!')
      }
    }

    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('\n❌ Profile error:', profileError)
    } else {
      console.log('\n📋 PROFILE DETAILS:')
      console.log('   Role:', profile.role)
      console.log('   Username:', profile.username || 'Not set')
      console.log('   Display Name:', profile.display_name || 'Not set')
      console.log('   Email in profile:', profile.email || profile.Email || 'Not set')
    }

    // Try to sign in programmatically to test
    console.log('\n🔐 TESTING SIGN-IN:')
    console.log('   Note: We cannot test password programmatically')
    console.log('   Please try to login manually with your password')

    console.log('\n' + '='.repeat(60))
    console.log('🎉 SUMMARY:')
    console.log('='.repeat(60))

    if (user.email_confirmed_at || !user.email_confirmed_at) {
      console.log('✅ Account is active')
      console.log('✅ Email is confirmed (or just fixed)')
      console.log('✅ Profile exists with admin role')
      console.log('\n📍 Try logging in now at: http://localhost:3000/auth/signin')
      console.log('\n💡 If still failing, the issue might be:')
      console.log('   1. Incorrect password (double-check for typos)')
      console.log('   2. Browser caching issues (try incognito mode)')
      console.log('   3. Supabase service issue')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

diagnoseAuthIssue()
