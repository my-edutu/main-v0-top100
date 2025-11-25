import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  console.log('🚀 Running database migrations...\n')

  try {
    // Migration 001: Contact messages and newsletter subscribers
    console.log('📝 Migration 001: Creating contact_messages and newsletter_subscribers tables...')
    const migration001 = readFileSync(
      resolve(process.cwd(), 'scripts/001_create_contact_messages_table.sql'),
      'utf-8'
    )

    const { error: error001 } = await supabase.rpc('exec_sql', { sql: migration001 })

    if (error001) {
      console.error('❌ Migration 001 failed:', error001.message)
    } else {
      console.log('✅ Migration 001 completed successfully\n')
    }

    // Migration 002: Interest registrations
    console.log('📝 Migration 002: Creating interest_registrations table...')
    const migration002 = readFileSync(
      resolve(process.cwd(), 'scripts/002_create_interest_registrations_table.sql'),
      'utf-8'
    )

    const { error: error002 } = await supabase.rpc('exec_sql', { sql: migration002 })

    if (error002) {
      console.error('❌ Migration 002 failed:', error002.message)
    } else {
      console.log('✅ Migration 002 completed successfully\n')
    }

    console.log('🎉 All migrations completed!')
  } catch (error) {
    console.error('❌ Fatal error running migrations:', error)
    process.exit(1)
  }
}

runMigrations()
  .then(() => {
    console.log('\n✨ Database is up to date!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
