const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  console.log('🔍 Checking Supabase connection...\n');
  console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('\n❌ Missing credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    // Test connection by checking awardees table
    const { count, error } = await supabase
      .from('awardees')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('\n❌ Connection error:', error.message);

      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('\n⚠️  Database schema needs to be updated!');
        console.log('\n📝 Please run the SQL migration first:');
        console.log('1. Open Supabase Dashboard → SQL Editor');
        console.log('2. Copy content from: supabase/update-awardees-schema.sql');
        console.log('3. Paste and click "Run"');
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('\n⚠️  Awardees table does not exist!');
        console.log('\n📝 Please create the table first:');
        console.log('1. Open Supabase Dashboard → SQL Editor');
        console.log('2. Run: CREATE TABLE awardees (...)');
      }

      process.exit(1);
    }

    console.log('\n✅ Connection successful!');
    console.log(`📊 Current awardees in database: ${count || 0}`);

    // Check if new columns exist
    const { data: sample, error: sampleError } = await supabase
      .from('awardees')
      .select('id, name, is_public, avatar_url, tagline')
      .limit(1);

    if (sampleError) {
      if (sampleError.message.includes('column') && sampleError.message.includes('does not exist')) {
        console.log('\n⚠️  New columns not found. Migration needed!');
        console.log('Missing columns: is_public, avatar_url, tagline, etc.');
        console.log('\n📝 Run the migration: supabase/update-awardees-schema.sql');
      }
    } else {
      console.log('✅ Schema is up to date with new columns');
    }

  } catch (err) {
    console.error('\n❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

checkConnection();
