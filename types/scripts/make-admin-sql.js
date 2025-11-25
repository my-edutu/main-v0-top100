const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function makeUserAdminSQL(email) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  const apiKey = serviceRoleKey || anonKey
  const supabase = createClient(supabaseUrl, apiKey)

  try {
    console.log('🔍 Checking if user exists in auth.users...')
    
    // First check if user exists in auth
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
    
    // Try to update existing profile or insert new one
    console.log('🔄 Attempting to update/create profile...')
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        email: authUser.email,
        role: 'admin'
      }, {
        onConflict: 'id'
      })
      .select()

    if (upsertError) {
      console.error('❌ Error upserting profile:', upsertError)
      
      // If upsert fails, try a simple update
      console.log('🔄 Trying simple update...')
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('email', email)
        .select()

      if (updateError) {
        console.error('❌ Error updating profile:', updateError)
        return false
      }
      
      if (updateData && updateData.length > 0) {
        console.log('✅ Profile updated successfully:', updateData)
        return true
      } else {
        console.log('❌ No profile found to update')
        return false
      }
    }

    console.log('✅ Profile upserted successfully:', upsertData)
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

const email = process.argv[2]

if (!email) {
  console.error('Usage: node make-admin-sql.js <email>')
  process.exit(1)
}

makeUserAdminSQL(email).then(success => {
  process.exit(success ? 0 : 1)
})