const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function inspectDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  const apiKey = serviceRoleKey || anonKey
  const supabase = createClient(supabaseUrl, apiKey)

  try {
    console.log('🔍 Checking database tables...')
    
    // Check if we can query information schema
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info', {})
      .select()

    if (tablesError) {
      console.log('Cannot access information schema, trying alternative approach...')
      
      // Try to see what columns are available by attempting inserts with different structures
      console.log('\n📋 Testing profiles table structure...')
      
      // First, try with user_id field
      const testData1 = {
        user_id: 'f56630ad-006a-4389-a4be-448cd7bc77b1',
        email: 'nwosupaul3@gmail.com',
        role: 'admin'
      }
      
      console.log('Testing with user_id:', testData1)
      const { data: test1, error: error1 } = await supabase
        .from('profiles')
        .insert(testData1)
        .select()

      if (error1) {
        console.log('❌ Error with user_id:', error1.message)
      } else {
        console.log('✅ Success with user_id:', test1)
        return
      }
      
      // Try with different field combinations
      const testData2 = {
        id: 'f56630ad-006a-4389-a4be-448cd7bc77b1',
        user_id: 'f56630ad-006a-4389-a4be-448cd7bc77b1',
        email: 'nwosupaul3@gmail.com',
        role: 'admin'
      }
      
      console.log('\nTesting with both id and user_id:', testData2)
      const { data: test2, error: error2 } = await supabase
        .from('profiles')
        .insert(testData2)
        .select()

      if (error2) {
        console.log('❌ Error with both fields:', error2.message)
      } else {
        console.log('✅ Success with both fields:', test2)
        return
      }

      // Let's try to see what already exists in awardees table to understand the pattern
      console.log('\n🔍 Checking awardees table for clues...')
      const { data: awardees, error: awardeesError } = await supabase
        .from('awardees')
        .select('*')
        .limit(1)

      if (awardeesError) {
        console.log('❌ Error checking awardees:', awardeesError)
      } else {
        console.log('📋 Awardee structure:', awardees[0] ? Object.keys(awardees[0]) : 'No awardees found')
      }

    } else {
      console.log('✅ Tables info:', tables)
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

inspectDatabase()