import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') })

// This script checks and fixes admin access for nwosupaul3@gmail.com

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

const TARGET_EMAIL = 'nwosupaul3@gmail.com'
const TARGET_PASSWORD = 'YourPassword123!' // Change this to your desired password

async function checkAndFixAdmin() {
  console.log('🔍 Checking admin access for:', TARGET_EMAIL)
  console.log('='.repeat(60))

  try {
    // Step 1: Check if user exists in auth.users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error listing users:', listError)
      return
    }

    const existingUser = users.users.find(u => u.email === TARGET_EMAIL)

    let userId: string

    if (!existingUser) {
      console.log('❌ User not found in auth.users')
      console.log('✨ Creating new user...')

      // Create user in auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: TARGET_EMAIL,
        password: TARGET_PASSWORD,
        email_confirm: true, // Auto-confirm email
      })

      if (createError) {
        console.error('❌ Error creating user:', createError)
        return
      }

      console.log('✅ User created in auth.users')
      userId = newUser.user.id
    } else {
      console.log('✅ User exists in auth.users')
      userId = existingUser.id
      console.log('   User ID:', userId)
    }

    // Step 2: Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileError)
      return
    }

    if (!profile) {
      console.log('❌ Profile not found in profiles table')
      console.log('✨ Creating admin profile...')

      // Create profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: TARGET_EMAIL,
          role: 'admin',
          username: TARGET_EMAIL.split('@')[0],
          display_name: 'Paul Nwosu',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('❌ Error creating profile:', insertError)
        return
      }

      console.log('✅ Admin profile created')
    } else {
      console.log('✅ Profile exists')
      console.log('   Current role:', profile.role)

      // Step 3: Ensure role is admin
      if (profile.role !== 'admin') {
        console.log('❌ Role is not admin, updating...')

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'admin', updated_at: new Date().toISOString() })
          .eq('id', userId)

        if (updateError) {
          console.error('❌ Error updating role:', updateError)
          return
        }

        console.log('✅ Role updated to admin')
      } else {
        console.log('✅ Role is already admin')
      }
    }

    // Step 4: Final verification
    console.log('\n' + '='.repeat(60))
    console.log('🎉 FINAL STATUS:')
    console.log('='.repeat(60))

    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    console.log('Email:', TARGET_EMAIL)
    console.log('User ID:', userId)
    console.log('Role:', finalProfile?.role)
    console.log('Username:', finalProfile?.username)
    console.log('Display Name:', finalProfile?.display_name)
    console.log('\n✅ You should now be able to login!')
    console.log('Password:', TARGET_PASSWORD)
    console.log('\n📍 Login URL: http://localhost:3000/auth/signin')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAndFixAdmin()
