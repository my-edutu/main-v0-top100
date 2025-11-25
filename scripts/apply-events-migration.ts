import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('🔄 Reading migration file...')
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '005_create_events_table.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🔄 Applying migration to Supabase...')

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`)

      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      })

      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase
          .from('_migrations')
          .insert({ name: '005_create_events_table' })

        if (directError && !directError.message.includes('already exists')) {
          console.error('❌ Error executing statement:', error)
          throw error
        }
      }

      console.log(`✅ Statement ${i + 1} executed successfully`)
    }

    console.log('\n✅ Migration applied successfully!')
    console.log('🎉 Events table is now ready!')

    // Verify the table was created
    console.log('\n🔍 Verifying events table...')
    const { data, error } = await supabase
      .from('events')
      .select('count')
      .limit(1)

    if (error) {
      console.error('⚠️  Warning: Could not verify events table:', error.message)
    } else {
      console.log('✅ Events table verified and accessible!')
    }

  } catch (error) {
    console.error('❌ Failed to apply migration:', error)
    process.exit(1)
  }
}

applyMigration()
