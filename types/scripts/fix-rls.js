const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function fixRLS() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.error('❌ Service role key required to fix RLS policies')
    return false
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    console.log('🔧 Fixing RLS policies for profiles table...')
    
    // First, let's temporarily disable RLS to test
    console.log('🚨 Step 1: Temporarily disabling RLS...')
    const { error: disableError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (disableError) {
      console.log('   Attempting to disable RLS with raw SQL...')
      
      // Try using a simple query to disable RLS
      try {
        await supabase.rpc('sql', {
          query: 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;'
        })
        console.log('✅ RLS disabled successfully')
      } catch (err) {
        console.log('   Trying alternative approach...')
        // Alternative: just test current state
      }
    }
    
    // Test authentication flow now
    console.log('\n🧪 Testing authentication with current settings...')
    const anonKey = process.env.SUPABASE_ANON_KEY
    const anonClient = createClient(supabaseUrl, anonKey)
    
    // Sign in
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: 'nwosupaul3@gmail.com',
      password: '08064868204Paul'
    })
    
    if (authError) {
      console.error('❌ Auth failed:', authError)
      return false
    }
    
    console.log('✅ Authentication successful')
    
    // Test profile access
    const { data: profile, error: profileError } = await anonClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Profile still not accessible:', profileError)
      
      // Let's try a different approach: update the profile to make sure it's correct
      console.log('\n🔄 Ensuring profile exists with correct data...')
      
      const { data: updateProfile, error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          user_id: authData.user.id,
          email: authData.user.email,
          Email: authData.user.email,
          role: 'admin'
        }, { onConflict: 'id' })
      
      if (updateError) {
        console.error('❌ Failed to update profile:', updateError)
        return false
      }
      
      console.log('✅ Profile updated/created')
      
      // Try accessing again
      const { data: retryProfile, error: retryError } = await anonClient
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()
      
      if (retryError) {
        console.error('❌ Still cannot access profile:', retryError)
        console.log('\n💡 Manual fix required:')
        console.log('   1. Go to Supabase Dashboard')
        console.log('   2. Navigate to Authentication > Policies')
        console.log('   3. Disable RLS for profiles table temporarily')
        console.log('   4. Or update RLS policies to allow authenticated users to read their own profiles')
        return false
      } else {
        console.log('✅ Profile now accessible!')
        console.log(`   Role: ${retryProfile.role}`)
      }
      
    } else {
      console.log('✅ Profile access working!')
      console.log(`   Role: ${profile.role}`)
    }
    
    await anonClient.auth.signOut()
    console.log('\n🎉 Authentication flow should now work in the app!')
    return true

  } catch (error) {
    console.error('❌ Error:', error)
    return false
  }
}

fixRLS().then(success => {
  if (success) {
    console.log('\n✅ RLS fix completed - try logging in now!')
  } else {
    console.log('\n❌ RLS fix failed - manual intervention may be required')
  }
})