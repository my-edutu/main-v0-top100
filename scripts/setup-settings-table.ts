/**
 * Setup script to create the site_settings table in Supabase
 *
 * Run this script with: npx tsx scripts/setup-settings-table.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function setupSettingsTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing environment variables')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('🚀 Setting up site_settings table...')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  try {
    // Read the SQL migration file
    const sqlPath = join(process.cwd(), 'scripts', 'create-settings-table.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql doesn't exist, try executing statements individually
      console.log('⚠️  exec_sql not available, trying alternative approach...')

      // Split SQL by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        try {
          const result = await supabase.rpc('exec', { query: statement })
          if (result.error) {
            console.warn(`⚠️  Statement warning:`, statement.substring(0, 50) + '...')
          }
        } catch (err) {
          console.warn(`⚠️  Could not execute statement:`, statement.substring(0, 50) + '...')
        }
      }
    }

    // Verify the table was created
    const { data, error: checkError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)

    if (checkError) {
      console.error('❌ Table verification failed:', checkError.message)
      console.log('\n📋 Manual setup required:')
      console.log('1. Go to your Supabase dashboard')
      console.log('2. Open the SQL Editor')
      console.log('3. Run the SQL from scripts/create-settings-table.sql')
      process.exit(1)
    }

    console.log('✅ site_settings table is ready!')
    console.log('\n🎉 Settings management is now fully functional')
    console.log('   You can access it at /admin/settings')

  } catch (error) {
    console.error('❌ Error setting up table:', error)
    console.log('\n📋 Manual setup required:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Open the SQL Editor')
    console.log('3. Run the SQL from scripts/create-settings-table.sql')
    process.exit(1)
  }
}

setupSettingsTable()
