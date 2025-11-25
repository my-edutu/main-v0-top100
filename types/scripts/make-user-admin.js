const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function makeUserAdmin(email) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('Available env vars:')
  console.log('- SUPABASE_URL:', !!process.env.SUPABASE_URL)
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log('- SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY)

  if (!supabaseUrl) {
    console.error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
    return false
  }

  // Use service role key if available, otherwise fall back to anon key
  const apiKey = serviceRoleKey || anonKey

  if (!apiKey) {
    console.error('Missing both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY')
    return false
  }

  if (!serviceRoleKey) {
    console.warn('⚠️  Using anon key instead of service role key - some operations may fail')
  }

  const supabase = createClient(supabaseUrl, apiKey)

  try {
    console.log(`Looking for user with email: ${email}`)
    
    // First, find the user in profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
    
    if (profileError) {
      console.error('Error finding user profile:', profileError)
      return false
    }

    if (!profiles || profiles.length === 0) {
      console.log('User profile not found. Checking auth.users table...')
      
      // Check if user exists in auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        console.error('Error checking auth users:', authError)
        return false
      }
      
      const userInAuth = authUser.users.find(user => user.email === email)
      
      if (userInAuth) {
        console.log('User exists in auth but not in profiles. Creating profile...')
        
        // Create profile for existing auth user
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userInAuth.id,
            email: userInAuth.email,
            role: 'admin'
          })
          .select()
        
        if (createError) {
          console.error('Error creating profile:', createError)
          return false
        }
        
        console.log('✅ Profile created and user set as admin:', newProfile)
        return true
      } else {
        console.log('User does not exist in auth.users. They need to sign up first.')
        return false
      }
    }

    const user = profiles[0]
    console.log('Found user:', { id: user.id, email: user.email, current_role: user.role })

    if (user.role === 'admin') {
      console.log('✅ User is already an admin!')
      return true
    }

    // Update user role to admin
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)
      .select()

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return false
    }

    console.log('✅ User role updated to admin:', updatedUser)
    return true

  } catch (error) {
    console.error('Unexpected error:', error)
    return false
  }
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.error('Usage: node make-user-admin.js <email>')
  process.exit(1)
}

makeUserAdmin(email).then(success => {
  process.exit(success ? 0 : 1)
})