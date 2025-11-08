const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testAPIEndpoint() {
  const supabaseUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  const supabase = createClient(supabaseUrl, anonKey)

  try {
    console.log('🧪 Testing complete authentication flow with API fix...')
    
    // Step 1: Sign in
    console.log('\n🔐 Step 1: Signing in...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'nwosupaul3@gmail.com',
      password: '08064868204Paul'
    })
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return false
    }
    
    console.log('✅ Authentication successful!')
    console.log(`   User ID: ${authData.user.id}`)

    // Step 2: Test the new API endpoint
    console.log('\n🌐 Step 2: Testing check-profile API...')
    
    const response = await fetch('http://localhost:3000/api/auth/check-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: authData.user.id })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API call failed:', response.status, errorText)
      return false
    }
    
    const result = await response.json()
    console.log('✅ API call successful!')
    console.log(`   Profile: ${JSON.stringify(result.profile, null, 2)}`)
    
    // Step 3: Sign out
    console.log('\n🚪 Step 3: Signing out...')
    await supabase.auth.signOut()
    console.log('✅ Signed out')
    
    console.log('\n🎉 Complete authentication flow test PASSED!')
    console.log('✅ The signin should now work in the web app!')
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

console.log('⚠️  Note: This test requires the Next.js app to be running on localhost:3000')
console.log('   If the app is not running, start it with: npm run dev')
console.log('   Then run this test again.')

testAPIEndpoint().then(success => {
  if (success) {
    console.log('\n✅ Authentication fix is working!')
    console.log('🚀 You can now log in at: http://localhost:3000/auth/signin')
    console.log('📧 Email: nwosupaul3@gmail.com')
    console.log('🔑 Password: 08064868204Paul')
  } else {
    console.log('\n❌ Test failed - check if Next.js app is running')
  }
})