import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function ask(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer)
    })
  })
}

async function checkAndFixAdmin() {
  console.log('\n🔍 Admin Role Diagnostic Tool\n')

  // Step 1: Get all users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    process.exit(1)
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No users found in the system')
    process.exit(0)
  }

  console.log(`📋 Found ${users.length} user(s):\n`)

  // Step 2: Check profiles for each user
  for (let i = 0; i < users.length; i++) {
    const user = users[i]

    // Get profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    console.log(`${i + 1}. ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`)

    if (profileError) {
      console.log(`   Profile: ❌ Error fetching profile: ${profileError.message}`)
    } else if (!profile) {
      console.log(`   Profile: ⚠️  No profile found`)
    } else {
      console.log(`   Role: ${profile.role || '(none)'}`)
      const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'
      console.log(`   Admin: ${isAdmin ? '✅ Yes' : '❌ No'}`)
    }
    console.log('')
  }

  // Step 3: Ask user what to do
  const email = await ask('\n📝 Enter the email address of the user you want to make admin (or press Enter to exit): ')

  if (!email.trim()) {
    console.log('\n👋 Exiting...')
    rl.close()
    process.exit(0)
  }

  const targetUser = users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

  if (!targetUser) {
    console.log(`\n❌ No user found with email: ${email}`)
    rl.close()
    process.exit(1)
  }

  // Step 4: Update role to admin
  console.log(`\n🔄 Setting ${targetUser.email} as admin...`)

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', targetUser.id)
    .select()
    .single()

  if (updateError) {
    console.error(`❌ Error updating role: ${updateError.message}`)

    // If profile doesn't exist, create it
    if (updateError.code === 'PGRST116') {
      console.log('📝 Profile not found, creating new profile...')

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: targetUser.id,
          email: targetUser.email,
          role: 'admin',
          full_name: targetUser.user_metadata?.full_name || null
        })
        .select()
        .single()

      if (insertError) {
        console.error(`❌ Error creating profile: ${insertError.message}`)
        rl.close()
        process.exit(1)
      }

      console.log('✅ Profile created with admin role!')
    } else {
      rl.close()
      process.exit(1)
    }
  } else {
    console.log('✅ Role updated successfully!')
  }

  console.log(`\n🎉 ${targetUser.email} is now an admin!`)
  console.log('\n⚠️  IMPORTANT: The user needs to sign out and sign back in for the role to take effect.\n')

  rl.close()
}

checkAndFixAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    rl.close()
    process.exit(1)
  })
