/**
 * Script to check admin access in Supabase
 * Run this to verify your admin role in the database
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkAdminAccess() {
  console.log('\n🔍 Checking Admin Access...\n')

  try {
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, Email, role')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching profiles:', error.message)
      return
    }

    console.log(`📊 Found ${profiles.length} profiles in database\n`)

    // Show all profiles
    console.log('All Profiles:')
    console.log('─'.repeat(80))
    profiles.forEach((profile, index) => {
      const email = profile.email || profile.Email
      const roleIcon = profile.role === 'admin' ? '👑' : profile.role === 'user' ? '👤' : '❓'
      console.log(`${index + 1}. ${roleIcon} ${email}`)
      console.log(`   ID: ${profile.id}`)
      console.log(`   Role: ${profile.role || 'NOT SET'}`)
      console.log('─'.repeat(80))
    })

    // Check for admin users
    const adminProfiles = profiles.filter(p => p.role === 'admin')
    console.log(`\n👑 Admin Users: ${adminProfiles.length}`)

    if (adminProfiles.length === 0) {
      console.log('\n⚠️  WARNING: No admin users found!')
      console.log('Run this to make yourself admin:')
      console.log('node scripts/make-me-admin.js YOUR_EMAIL@example.com')
    } else {
      console.log('\nAdmin users:')
      adminProfiles.forEach(admin => {
        const email = admin.email || admin.Email
        console.log(`  ✅ ${email}`)
      })
    }

    // Check for the whitelisted email
    const whitelistedEmail = 'nwosupaul3@gmail.com'
    const whitelistedProfile = profiles.find(p =>
      (p.email === whitelistedEmail || p.Email === whitelistedEmail)
    )

    console.log(`\n🎯 Checking whitelisted email: ${whitelistedEmail}`)
    if (whitelistedProfile) {
      console.log(`  ✅ Profile exists`)
      console.log(`  ID: ${whitelistedProfile.id}`)
      console.log(`  Role: ${whitelistedProfile.role}`)

      if (whitelistedProfile.role === 'admin') {
        console.log(`  ✅ Has admin role - Should be able to access /admin`)
      } else {
        console.log(`  ❌ Role is NOT admin - Need to fix this!`)
        console.log(`  Run: node scripts/make-me-admin.js ${whitelistedEmail}`)
      }
    } else {
      console.log(`  ❌ No profile found for ${whitelistedEmail}`)
      console.log(`  Need to create account first`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkAdminAccess()
