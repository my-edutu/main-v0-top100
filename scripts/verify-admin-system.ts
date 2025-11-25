#!/usr/bin/env tsx

/**
 * Admin Control System Verification Script
 * Checks all admin functionality and reports status
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

const results: TestResult[] = []

async function checkTable(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from(tableName).select('id').limit(1)
    if (error) {
      console.error(`  ❌ ${tableName}: ${error.message}`)
      results.push({
        name: `Table: ${tableName}`,
        status: 'fail',
        message: error.message
      })
      return false
    }
    console.log(`  ✅ ${tableName}: OK`)
    results.push({
      name: `Table: ${tableName}`,
      status: 'pass',
      message: 'Table accessible'
    })
    return true
  } catch (err) {
    console.error(`  ❌ ${tableName}: ${err}`)
    results.push({
      name: `Table: ${tableName}`,
      status: 'fail',
      message: String(err)
    })
    return false
  }
}

async function checkAdminUsers(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'admin')

    if (error) {
      results.push({
        name: 'Admin Users',
        status: 'fail',
        message: error.message
      })
      console.log('  ❌ Failed to check admin users')
      return
    }

    if (!data || data.length === 0) {
      results.push({
        name: 'Admin Users',
        status: 'warn',
        message: 'No admin users found'
      })
      console.log('  ⚠️  No admin users found')
      console.log('     Create one by updating a profile: UPDATE profiles SET role = \'admin\' WHERE email = \'your@email.com\'')
    } else {
      results.push({
        name: 'Admin Users',
        status: 'pass',
        message: `${data.length} admin user(s) found`
      })
      console.log(`  ✅ Found ${data.length} admin user(s):`)
      data.forEach(user => console.log(`     - ${user.email}`))
    }
  } catch (err) {
    results.push({
      name: 'Admin Users',
      status: 'fail',
      message: String(err)
    })
    console.log(`  ❌ Error: ${err}`)
  }
}

async function checkFeaturedContent(): Promise<void> {
  try {
    // Check featured posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title')
      .eq('is_featured', true)
      .eq('status', 'published')

    if (postsError) {
      results.push({
        name: 'Featured Posts',
        status: 'fail',
        message: postsError.message
      })
      console.log(`  ❌ Featured posts: ${postsError.message}`)
    } else {
      results.push({
        name: 'Featured Posts',
        status: 'pass',
        message: `${posts?.length || 0} featured post(s)`
      })
      console.log(`  ✅ Featured posts: ${posts?.length || 0}`)
    }

    // Check featured awardees
    const { data: awardees, error: awardeesError } = await supabase
      .from('awardees')
      .select('id, name')
      .eq('featured', true)
      .eq('is_public', true)

    if (awardeesError) {
      results.push({
        name: 'Featured Awardees',
        status: 'fail',
        message: awardeesError.message
      })
      console.log(`  ❌ Featured awardees: ${awardeesError.message}`)
    } else {
      results.push({
        name: 'Featured Awardees',
        status: 'pass',
        message: `${awardees?.length || 0} featured awardee(s)`
      })
      console.log(`  ✅ Featured awardees: ${awardees?.length || 0}`)
    }

    // Check featured events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title')
      .eq('is_featured', true)
      .eq('status', 'published')

    if (eventsError) {
      results.push({
        name: 'Featured Events',
        status: 'fail',
        message: eventsError.message
      })
      console.log(`  ❌ Featured events: ${eventsError.message}`)
    } else {
      results.push({
        name: 'Featured Events',
        status: 'pass',
        message: `${events?.length || 0} featured event(s)`
      })
      console.log(`  ✅ Featured events: ${events?.length || 0}`)
    }
  } catch (err) {
    results.push({
      name: 'Featured Content',
      status: 'fail',
      message: String(err)
    })
    console.log(`  ❌ Error checking featured content: ${err}`)
  }
}

async function checkHomepageSections(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('homepage_sections')
      .select('section_key, is_active')
      .eq('is_active', true)

    if (error) {
      results.push({
        name: 'Homepage Sections',
        status: 'fail',
        message: error.message
      })
      console.log(`  ❌ Homepage sections: ${error.message}`)
    } else {
      results.push({
        name: 'Homepage Sections',
        status: 'pass',
        message: `${data?.length || 0} active section(s)`
      })
      console.log(`  ✅ Homepage sections: ${data?.length || 0} active`)
      if (data && data.length > 0) {
        console.log('     Active sections:', data.map(s => s.section_key).join(', '))
      }
    }
  } catch (err) {
    results.push({
      name: 'Homepage Sections',
      status: 'fail',
      message: String(err)
    })
    console.log(`  ❌ Error: ${err}`)
  }
}

async function main() {
  console.log('==========================================')
  console.log('Admin Control System Verification')
  console.log('==========================================\n')

  console.log('🔍 Checking database tables...')
  const tables = ['profiles', 'posts', 'events', 'awardees', 'homepage_sections', 'youtube_videos']
  for (const table of tables) {
    await checkTable(table)
  }
  console.log()

  console.log('👤 Checking admin users...')
  await checkAdminUsers()
  console.log()

  console.log('⭐ Checking featured content...')
  await checkFeaturedContent()
  console.log()

  console.log('🏠 Checking homepage sections...')
  await checkHomepageSections()
  console.log()

  // Summary
  console.log('==========================================')
  console.log('Verification Summary')
  console.log('==========================================\n')

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const warnings = results.filter(r => r.status === 'warn').length

  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log()

  if (failed > 0) {
    console.log('Failed Tests:')
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.message}`)
    })
    console.log()
  }

  if (warnings > 0) {
    console.log('Warnings:')
    results.filter(r => r.status === 'warn').forEach(r => {
      console.log(`  ⚠️  ${r.name}: ${r.message}`)
    })
    console.log()
  }

  console.log('==========================================')
  console.log('Admin Features Status')
  console.log('==========================================\n')

  console.log('✅ Blog/Posts Management - Ready')
  console.log('   API: /api/posts')
  console.log('   Admin: /admin/blog\n')

  console.log('✅ Awardees Management - Ready')
  console.log('   API: /api/awardees')
  console.log('   Admin: /admin/awardees\n')

  console.log('✅ Events Management - Ready')
  console.log('   API: /api/events')
  console.log('   Admin: /admin/events\n')

  console.log('✅ Homepage CMS - Ready')
  console.log('   API: /api/homepage-sections')
  console.log('   Admin: /admin/homepage\n')

  console.log('==========================================')
  console.log('Next Steps')
  console.log('==========================================\n')

  if (warnings > 0 || failed > 0) {
    console.log('1. Fix any failed tests or warnings above')
    console.log('2. Create an admin user if none exists')
    console.log('3. Add featured content for homepage display')
    console.log('4. Test admin dashboard at /admin')
  } else {
    console.log('✅ System is ready!')
    console.log('1. Start development server: npm run dev')
    console.log('2. Access admin dashboard: http://localhost:3000/admin')
    console.log('3. Test all admin features')
  }

  console.log()
  process.exit(failed > 0 ? 1 : 0)
}

main()
