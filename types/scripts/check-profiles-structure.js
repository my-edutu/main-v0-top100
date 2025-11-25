const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function checkProfilesStructure() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  const apiKey = serviceRoleKey || anonKey
  const supabase = createClient(supabaseUrl, apiKey)

  try {
    console.log('Checking profiles table structure...')
    
    // Get a sample row to see the structure
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Error:', error)
      return
    }

    console.log('Sample profile row structure:')
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]))
      console.log('Sample data:', data[0])
    } else {
      console.log('No profiles found')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkProfilesStructure()