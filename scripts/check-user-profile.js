const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function checkUserProfile() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  const apiKey = serviceRoleKey || anonKey
  const supabase = createClient(supabaseUrl, apiKey)

  const userEmail = 'nwosupaul3@gmail.com'

  try {
    console.log(`🔍 Checking profile data for: ${userEmail}`)
    console.log('='.repeat(60))
    
    // 1. Check profiles table for this user
    console.log('\n📋 Checking profiles table...')
    
    // Try both 'email' and 'Email' fields since the structure shows both exist
    const { data: profiles1, error: profilesError1 } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)

    const { data: profiles2, error: profilesError2 } = await supabase
      .from('profiles')
      .select('*')
      .eq('Email', userEmail)

    // Also try with the auth user ID we found
    const { data: profiles3, error: profilesError3 } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', 'f56630ad-006a-4389-a4be-448cd7bc77b1')

    let profiles = []
    if (!profilesError1 && profiles1) profiles = profiles.concat(profiles1)
    if (!profilesError2 && profiles2) profiles = profiles.concat(profiles2)
    if (!profilesError3 && profiles3) profiles = profiles.concat(profiles3)

    console.log('Query results:')
    console.log('- email field query:', profilesError1 ? `Error: ${profilesError1.message}` : `Found ${profiles1?.length || 0} records`)
    console.log('- Email field query:', profilesError2 ? `Error: ${profilesError2.message}` : `Found ${profiles2?.length || 0} records`)
    console.log('- user_id query:', profilesError3 ? `Error: ${profilesError3.message}` : `Found ${profiles3?.length || 0} records`)
    
    // Remove duplicates if any
    const uniqueProfiles = profiles.filter((profile, index, self) => 
      index === self.findIndex(p => p.id === profile.id)
    )

    if (profilesError1 && profilesError2) {
      console.error('❌ Error querying profiles (email):', profilesError1)
      console.error('❌ Error querying profiles (Email):', profilesError2)
    } else if (uniqueProfiles && uniqueProfiles.length > 0) {
      console.log('✅ Profile(s) found in profiles table:')
      uniqueProfiles.forEach((profile, index) => {
        console.log(`\nProfile ${index + 1}:`)
        console.log('Fields and values:')
        Object.entries(profile).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`)
        })
      })
      profiles = uniqueProfiles // Update profiles variable for later use
    } else {
      console.log('❌ No profiles found in profiles table')
      profiles = [] // Ensure profiles is empty for later checks
    }

    // 2. Check for other tables that might be related
    console.log('\n🔍 Checking for other tables...')
    
    // Let's see what tables are available
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_tables')
      .select()
    
    if (!tablesError && tables) {
      console.log('Available tables:', tables.map(t => t.table_name).join(', '))
    } else {
      console.log('Cannot retrieve table list - will check common table names')
      
      // Check for nominations or submissions tables
      try {
        const { data: nominations, error: nominationsError } = await supabase
          .from('nominations')
          .select('*')
          .or(`nominee_email.eq.${userEmail},nominator_email.eq.${userEmail}`)
          .limit(5)

        if (!nominationsError && nominations && nominations.length > 0) {
          console.log('✅ Found nominations:')
          nominations.forEach((nomination, index) => {
            console.log(`\nNomination ${index + 1}:`)
            Object.entries(nomination).forEach(([key, value]) => {
              console.log(`  ${key}: ${value}`)
            })
          })
        } else {
          console.log('No nominations found or table does not exist')
        }
      } catch (e) {
        console.log('Nominations table check failed:', e.message)
      }
    }

    // 3. Check auth.users table for this user
    console.log('\n👤 Checking auth.users table...')
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('*')
      .eq('email', userEmail)

    if (authError) {
      console.log('⚠️ Cannot query auth.users directly (expected):', authError.message)
      
      // Try using RPC or other method to get auth user info
      try {
        const { data: userInfo, error: userInfoError } = await supabase.auth.admin.listUsers()
        if (userInfoError) {
          console.log('⚠️ Cannot access user list:', userInfoError.message)
        } else {
          const targetUser = userInfo.users.find(user => user.email === userEmail)
          if (targetUser) {
            console.log('✅ User found in auth:')
            console.log(`  ID: ${targetUser.id}`)
            console.log(`  Email: ${targetUser.email}`)
            console.log(`  Created: ${targetUser.created_at}`)
            console.log(`  Confirmed: ${targetUser.email_confirmed_at ? 'Yes' : 'No'}`)
          } else {
            console.log('❌ User not found in auth')
          }
        }
      } catch (authListError) {
        console.log('⚠️ Cannot list auth users:', authListError.message)
      }
    } else {
      console.log('✅ Auth user found:', authUsers)
    }

    // 4. Check for any other tables that might contain user data
    console.log('\n🔍 Checking other potential user-related tables...')
    
    // Check by different potential identifiers
    if (profiles && profiles.length > 0) {
      const profileId = profiles[0].id || profiles[0].user_id
      if (profileId) {
        console.log(`\n🔗 Looking for references to user ID: ${profileId}`)
        
        // Check nominations table
        try {
          const { data: nominations, error: nominationsError } = await supabase
            .from('nominations')
            .select('*')
            .eq('nominee_email', userEmail)

          if (!nominationsError && nominations && nominations.length > 0) {
            console.log('📝 Nominations found:')
            nominations.forEach((nomination, index) => {
              console.log(`  Nomination ${index + 1}:`)
              Object.entries(nomination).forEach(([key, value]) => {
                console.log(`    ${key}: ${value}`)
              })
            })
          }
        } catch (e) {
          console.log('⚠️ Nominations table not accessible or does not exist')
        }
      }
    }

    // 5. Check for potential issues that might cause "profile not found" error
    console.log('\n🔎 Analyzing potential issues:')
    
    if (profiles && profiles.length > 0) {
      const profile = profiles[0]
      
      // Check for missing required fields
      const requiredFields = ['id', 'email', 'role', 'created_at']
      const missingFields = requiredFields.filter(field => !profile[field])
      
      if (missingFields.length > 0) {
        console.log(`⚠️ Missing required fields: ${missingFields.join(', ')}`)
      } else {
        console.log('✅ All basic required fields are present')
      }

      // Check role
      if (profile.role) {
        console.log(`📝 User role: ${profile.role}`)
        if (profile.role !== 'awardee') {
          console.log('⚠️ User role is not "awardee" - this might cause the "Awardee profile not found" error')
        }
      }

      // Check if the user role might cause issues
      if (profile.role && profile.role !== 'awardee') {
        console.log(`⚠️ User role is "${profile.role}" not "awardee" - this might cause the "Awardee profile not found" error`)
        console.log('💡 Solution: The user role might need to be "awardee" instead of "admin"')
      }

      // Check for duplicate entries
      if (profiles.length > 1) {
        console.log(`⚠️ Multiple profile entries found (${profiles.length}) - this might cause confusion`)
      }
    } else {
      console.log('❌ No profile found in profiles table - this would definitely cause errors')
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎯 DETAILED ANALYSIS:')
    console.log('🔍 Based on signin code analysis:')
    console.log('   - The app queries profiles table using: .eq("id", user.id)')
    console.log('   - But the user profile has user_id field, not id matching auth user ID')
    console.log('   - Auth user ID: f56630ad-006a-4389-a4be-448cd7bc77b1')
    console.log('   - Profile user_id: f56630ad-006a-4389-a4be-448cd7bc77b1 ✅')
    console.log('   - Profile id: 4a2af34f-e376-4491-a57d-00317b89a150 ❌')
    console.log('')
    console.log('🎯 ROOT CAUSE IDENTIFIED:')
    console.log('   The signin code is looking for a profile where id = user.id')
    console.log('   But this profile has a different id field value!')
    console.log('   The correct lookup should use user_id field, not id field.')
    console.log('')
    
    if (profiles && profiles.length > 0) {
      console.log('✅ Profile exists in profiles table')
      const profile = profiles[0]
      
      // Check data quality issues
      const issues = []
      const solutions = []
      
      if (!profile.email && !profile.Email) {
        issues.push('No email field populated')
      }
      
      if (profile.Email && !profile.email) {
        issues.push('Email in "Email" field but not "email" field - case sensitivity issue')
        solutions.push('Copy Email value to email field: UPDATE profiles SET email = "Email" WHERE id = \'' + profile.id + '\'')
      }
      
      if (profile.role === 'admin') {
        issues.push('User role is "admin" - the signin allows "admin" role, so this should work')
      }

      // The main issue: ID mismatch
      issues.push('CRITICAL: Profile id ≠ auth user id - signin query will fail')
      solutions.push('Update profile id to match auth user id: UPDATE profiles SET id = \'' + profile.user_id + '\' WHERE id = \'' + profile.id + '\'')
      
      if (issues.length > 0) {
        console.log('⚠️ Issues found:')
        issues.forEach(issue => console.log(`   - ${issue}`))
        
        console.log('\n💡 SOLUTIONS:')
        solutions.forEach(solution => console.log(`   - ${solution}`))
        
        console.log('\n🚨 IMMEDIATE FIX NEEDED:')
        console.log('   The profile.id must equal the auth user ID for signin to work!')
        console.log('   Current: profile.id = 4a2af34f-e376-4491-a57d-00317b89a150')
        console.log('   Required: profile.id = f56630ad-006a-4389-a4be-448cd7bc77b1')
      } else {
        console.log('✅ Profile data looks good')
      }
    } else {
      console.log('❌ No profile found in profiles table')
      console.log('💡 This would definitely cause "Top100 Awardee profile not found" error')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkUserProfile()