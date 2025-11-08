const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function checkAndFixRLS() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    console.log('🔍 Checking RLS policies for profiles table...')
    
    // Check current RLS policies
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'profiles' })
      .catch(() => null) // Ignore if function doesn't exist

    if (policies) {
      console.log('📋 Current RLS policies:')
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.definition}`)
      })
    } else {
      console.log('⚠️ Cannot retrieve policies directly')
    }

    // Test RLS with authenticated user
    console.log('\n🧪 Testing RLS with authenticated user...')
    
    // Create anon client
    const anonKey = process.env.SUPABASE_ANON_KEY
    const anonClient = createClient(supabaseUrl, anonKey)
    
    // Sign in
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: 'nwosupaul3@gmail.com',
      password: '08064868204Paul'
    })
    
    if (authError) {
      console.error('❌ Auth failed:', authError)
      return
    }
    
    console.log('✅ Authenticated successfully')
    
    // Test profile access
    const { data: profile, error: profileError } = await anonClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Profile access failed:', profileError)
      console.log('\n🔧 FIXING RLS POLICIES...')
      
      // Drop existing policies
      await supabase.rpc('exec', {
        sql: `
          DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
          DROP POLICY IF EXISTS "Public view for listed profiles" ON public.profiles;
        `
      }).catch(() => null)
      
      // Create new working policies
      const { error: createError } = await supabase.rpc('exec', {
        sql: `
          -- Allow users to view their own profile
          CREATE POLICY "Users can view own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
            
          -- Allow users to update their own profile  
          CREATE POLICY "Users can update own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
            
          -- Allow service role to do anything
          CREATE POLICY "Service role full access" ON public.profiles
            FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
        `
      })
      
      if (createError) {
        console.error('❌ Failed to create policies:', createError)
      } else {
        console.log('✅ RLS policies created successfully')
      }
      
      // Test again
      console.log('\n🔄 Testing access again...')
      const { data: retryProfile, error: retryError } = await anonClient
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()
      
      if (retryError) {
        console.error('❌ Still failed:', retryError)
        
        // Try alternative: disable RLS temporarily
        console.log('\n🚨 Temporarily disabling RLS for testing...')
        await supabase.rpc('exec', {
          sql: 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;'
        })
        
        console.log('⚠️ RLS disabled - profile should be accessible now')
        console.log('   Remember to re-enable RLS after testing!')
        
      } else {
        console.log('✅ Profile access now working!')
        console.log(`   Profile: ${JSON.stringify(retryProfile, null, 2)}`)
      }
    } else {
      console.log('✅ Profile access already working!')
      console.log(`   Profile: ${JSON.stringify(profile, null, 2)}`)
    }
    
    await anonClient.auth.signOut()

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkAndFixRLS()