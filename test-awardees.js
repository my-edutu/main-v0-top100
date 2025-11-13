require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAwardees() {
  try {
    // Test a few sample slugs from the CSV
    const testSlugs = ['maku-victor', 'adedara-joshua-favour', 'peculiar-oladejo'];
    
    for (const slug of testSlugs) {
      const { data, error } = await supabase
        .from('awardees')
        .select('id, name, slug')
        .eq('slug', slug)
        .single();
        
      console.log(`Slug: ${slug}`);
      if (error) {
        console.log('  Error:', error.message);
      } else {
        console.log('  Found:', data);
      }
      console.log('---');
    }
  } catch (e) {
    console.error('Test error:', e);
  }
}

testAwardees();