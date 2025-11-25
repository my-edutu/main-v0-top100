const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('🔄 Reading migration file...')
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '005_create_events_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('✅ Migration file loaded')
    console.log('\n📋 Migration contains:')
    console.log('  - CREATE TABLE events')
    console.log('  - CREATE INDEXES')
    console.log('  - CREATE TRIGGER')
    console.log('  - RLS POLICIES')
    console.log('  - SAMPLE DATA')

    console.log('\n🔄 Checking if events table already exists...')

    const { data: existingTable, error: checkError } = await supabase
      .from('events')
      .select('id')
      .limit(1)

    if (!checkError) {
      console.log('ℹ️  Events table already exists!')
      console.log('✅ Your events system is ready to use!')
      return
    }

    console.log('📝 Events table not found, creating it now...')
    console.log('\n⚠️  NOTE: This script will output the SQL that needs to be run.')
    console.log('Please copy and paste it into your Supabase SQL Editor:')
    console.log('👉 https://supabase.com/dashboard/project/zsavekrhfwrpqudhjvlq/sql/new')
    console.log('\n' + '='.repeat(80))
    console.log(migrationSQL)
    console.log('='.repeat(80))

    console.log('\n\nℹ️  After running the SQL in Supabase dashboard:')
    console.log('1. Go to: https://supabase.com/dashboard/project/zsavekrhfwrpqudhjvlq/sql/new')
    console.log('2. Copy the SQL above')
    console.log('3. Paste it into the SQL editor')
    console.log('4. Click "Run"')
    console.log('5. Your events table will be created with sample data!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

applyMigration()
