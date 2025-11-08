const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function makeUserAdminFinal(email) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  const apiKey = serviceRoleKey || anonKey
  const supabase = createClient(supabaseUrl, apiKey)

  try {
    console.log(`🔍 Making ${email} an admin...`)
    
    // Get user from auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError)
      return false
    }
    
    const authUser = authUsers.users.find(user => user.email === email)
    
    if (!authUser) {
      console.log('❌ User not found in authentication. They need to sign up first.')
      return false
    }
    
    console.log('✅ User found in auth:', authUser.id)
    
    // Try different column name combinations based on the error we saw
    const profileData = {
      user_id: authUser.id,
      Email: authUser.email,  // Capital E based on error message
      Role: 'admin'  // Try capital R as well
    }
    
    console.log('🔄 Attempting to insert profile with capitalized columns...')
    console.log('Data:', profileData)
    
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()

    if (insertError) {
      console.error('❌ Error with capitalized columns:', insertError)
      
      // Try with mixed case
      const mixedData = {
        user_id: authUser.id,
        email: authUser.email,
        Role: 'admin'
      }
      
      console.log('🔄 Trying mixed case...')
      const { data: mixedResult, error: mixedError } = await supabase
        .from('profiles')
        .insert(mixedData)
        .select()

      if (mixedError) {
        console.error('❌ Error with mixed case:', mixedError)
        
        // Try all lowercase
        const lowerData = {
          user_id: authUser.id,
          email: authUser.email,
          role: 'admin'
        }
        
        console.log('🔄 Trying all lowercase...')
        const { data: lowerResult, error: lowerError } = await supabase
          .from('profiles')
          .insert(lowerData)
          .select()

        if (lowerError) {
          console.error('❌ Error with lowercase:', lowerError)
          return false
        } else {
          console.log('✅ Success with lowercase:', lowerResult)
          return true
        }
      } else {
        console.log('✅ Success with mixed case:', mixedResult)
        return true
      }
    } else {
      console.log('✅ Success with capitalized columns:', insertData)
      return true
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

const email = process.argv[2]

if (!email) {
  console.error('Usage: node make-admin-final.js <email>')
  process.exit(1)
}

makeUserAdminFinal(email).then(success => {
  console.log(success ? '🎉 Admin role granted successfully!' : '😞 Failed to grant admin role')
  process.exit(success ? 0 : 1)
})