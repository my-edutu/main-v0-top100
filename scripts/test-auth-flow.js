const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testAuthFlow(email, password) {
  const supabaseUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY // Use anon key to simulate browser

  console.log('🔧 Testing authentication flow...')
  console.log(`📧 Email: ${email}`)
  console.log(`🌐 URL: ${supabaseUrl}`)
  console.log(`🔑 Using anon key: ${anonKey ? 'Yes' : 'No'}`)
  
  const supabase = createClient(supabaseUrl, anonKey)

  try {
    // Step 1: Attempt sign in
    console.log('\n🔐 Step 1: Attempting sign in...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return false
    }
    
    console.log('✅ Authentication successful!')
    console.log(`   User ID: ${authData.user.id}`)
    console.log(`   Email: ${authData.user.email}`)

    // Step 2: Get user (like the app does)
    console.log('\n👤 Step 2: Getting user...')
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ Get user error:', userError)
      return false
    }
    
    console.log('✅ User retrieved successfully!')
    console.log(`   User ID: ${userData.user.id}`)

    // Step 3: Query profile (EXACTLY like the app does)
    console.log('\n📋 Step 3: Querying profile...')
    console.log(`   Looking for profile where id = ${userData.user.id}`)
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile query error:', profileError)
      console.error('   This is the exact error causing "Top100 Awardee profile not found"')
      
      // Let's try alternative queries to debug
      console.log('\n🔍 Debug: Trying alternative queries...')
      
      // Try with user_id
      const { data: profileByUserId, error: userIdError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userData.user.id)
        .single()
      
      if (!userIdError && profileByUserId) {
        console.log('✅ Profile found using user_id field!')
        console.log('   This confirms the profile exists but RLS/query is wrong')
        console.log(`   Profile: ${JSON.stringify(profileByUserId, null, 2)}`)
      } else {
        console.error('❌ Profile not found even with user_id:', userIdError)
      }
      
      // Try without single() to see all results
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
      
      console.log(`🔍 All profiles with id=${userData.user.id}:`, allProfiles)
      
      return false
    }

    console.log('✅ Profile found!')
    console.log(`   Profile: ${JSON.stringify(profile, null, 2)}`)

    // Step 4: Check role (like the app does)
    console.log('\n👑 Step 4: Checking role...')
    if (profile.role !== 'admin' && profile.role !== 'user') {
      console.error(`❌ Invalid role: ${profile.role}`)
      return false
    }
    
    console.log(`✅ Valid role: ${profile.role}`)
    
    // Step 5: Sign out
    console.log('\n🚪 Step 5: Signing out...')
    await supabase.auth.signOut()
    console.log('✅ Signed out')
    
    console.log('\n🎉 Authentication flow completed successfully!')
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: node test-auth-flow.js <email> <password>')
  process.exit(1)
}

testAuthFlow(email, password).then(success => {
  console.log(success ? '\n🎉 Auth flow test PASSED!' : '\n😞 Auth flow test FAILED!')
  process.exit(success ? 0 : 1)
})