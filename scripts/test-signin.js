const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testSignIn() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('Testing sign-in flow for nwosupaul3@gmail.com')
  console.log('='.repeat(60))

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'NOT SET')
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'NOT SET')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const email = 'nwosupaul3@gmail.com'
  const password = 'Top100@2025' // You may need to update this

  try {
    console.log('\n🔐 Step 1: Attempting sign in...')
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error('❌ Sign-in failed:', signInError.message)
      return
    }

    console.log('✅ Sign-in successful!')
    console.log('User ID:', authData.user.id)
    console.log('Email:', authData.user.email)

    console.log('\n📋 Step 2: Checking profile via API...')
    const response = await fetch(`${supabaseUrl.replace('.supabase.co', '')}/api/auth/check-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: authData.user.id })
    })

    console.log('API Response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Profile check failed:', errorData)
      return
    }

    const { profile } = await response.json()
    console.log('✅ Profile check successful!')
    console.log('Role:', profile.role)
    console.log('Email:', profile.email)

    console.log('\n🎉 SIGN-IN FLOW COMPLETED SUCCESSFULLY!')
    console.log('The user should be redirected to:', profile.role === 'admin' ? '/admin' : '/dashboard')

    // Clean up
    await supabase.auth.signOut()

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testSignIn()
