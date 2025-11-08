const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

async function setupAwardeesSystem() {
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

  console.log('🚀 Starting awardees system setup...\n');

  try {
    // Step 1: Run database migration
    console.log('📊 Step 1: Updating database schema...');

    const migrationPath = path.join(__dirname, '..', 'supabase', 'update-awardees-schema.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    // Split migration into individual statements
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error && !error.message.includes('already exists')) {
          console.warn(`⚠️  Warning during migration: ${error.message}`);
        }
      }
    }

    console.log('✅ Database schema updated successfully\n');

    // Step 2: Check current awardees count
    console.log('📊 Step 2: Checking existing awardees...');

    const { count, error: countError } = await supabase
      .from('awardees')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    console.log(`   Found ${count || 0} existing awardees\n`);

    // Step 3: Offer to import from Excel
    if (count === 0) {
      console.log('📥 Step 3: Importing awardees from Excel...');
      console.log('   Please use the admin interface at /admin/awardees/import to upload the Excel file');
      console.log('   Or use the API: POST /api/awardees/import\n');
    } else {
      console.log('✅ Awardees already exist in database\n');
    }

    console.log('🎉 Setup complete!\n');
    console.log('📝 Summary:');
    console.log('   - Database schema updated');
    console.log('   - Visibility control enabled');
    console.log('   - Avatar, tagline, social links, achievements fields added');
    console.log(`   - ${count || 0} awardees currently in database`);
    console.log('\n✨ You can now:');
    console.log('   1. Import awardees via /admin/awardees');
    console.log('   2. Toggle visibility for each profile');
    console.log('   3. View profiles at /awardees/[slug]');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    process.exit(1);
  }
}

setupAwardeesSystem();
