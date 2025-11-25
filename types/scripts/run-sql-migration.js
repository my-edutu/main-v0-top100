const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    db: { schema: 'public' }
  });

  console.log('🚀 Running SQL migration...\n');

  try {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'update-awardees-schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Executing SQL commands...\n');

    // Execute the SQL directly
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql RPC doesn't exist, we'll need to run commands individually
      console.log('⚠️  exec_sql RPC not available, running commands individually...\n');

      // Split and run individual commands
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        console.log(`Running command ${i + 1}/${commands.length}...`);

        // For ALTER TABLE and CREATE INDEX commands
        if (cmd.toUpperCase().includes('ALTER TABLE') || cmd.toUpperCase().includes('CREATE INDEX')) {
          const { error: cmdError } = await supabase.from('_sqlRunner').select('*').limit(0);

          // Since we can't run arbitrary SQL via JS client easily, we'll provide manual instructions
          console.log('\n📝 Please run the following SQL in Supabase SQL Editor:');
          console.log('\n' + migrationSQL);
          console.log('\n✅ Then re-run this script to verify\n');
          return;
        }
      }
    } else {
      console.log('✅ Migration completed successfully!\n');
    }

    // Verify the changes
    console.log('🔍 Verifying schema changes...\n');

    const { data: awardees, error: checkError } = await supabase
      .from('awardees')
      .select('id, name, is_public, avatar_url, tagline')
      .limit(1);

    if (checkError) {
      if (checkError.message.includes('column') && checkError.message.includes('does not exist')) {
        console.log('⚠️  Columns not yet added. Please run the SQL migration manually:');
        console.log('\n1. Open Supabase Dashboard → SQL Editor');
        console.log('2. Copy and paste the content from: supabase/update-awardees-schema.sql');
        console.log('3. Click "Run" to execute\n');
      } else {
        throw checkError;
      }
    } else {
      console.log('✅ Schema verification passed!');
      console.log('✅ New columns are available in the awardees table\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Manual migration required:');
    console.log('1. Open Supabase Dashboard → SQL Editor');
    console.log('2. Copy and paste the content from: supabase/update-awardees-schema.sql');
    console.log('3. Click "Run" to execute\n');
  }
}

runMigration();
