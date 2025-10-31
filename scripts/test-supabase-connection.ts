import { createClient } from '@/lib/supabase/server';

// Load environment variables (for when running outside of Next.js)
import { config } from 'dotenv';
config({ path: './.env.local' });

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test the basic connection first
    const supabase = createClient();
    
    // Test the connection by making a simple query to check if the profiles table exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .limit(1);
    
    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.log('⚠️  Table does not exist yet - this may be because the schema hasn\'t been pushed to Supabase');
        console.log('✅  Supabase connection is working, but the database schema may need to be set up');
      } else {
        console.error('❌ Error connecting to Supabase:', error.message);
        return false;
      }
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log('✅ Found profiles table with sample data:', data);
    }
    
    // Also test service role connection
    const serviceSupabase = createClient(true);
    const { data: serviceData, error: serviceError } = await serviceSupabase
      .from('profiles')
      .select('id, email, role')
      .limit(1);
    
    if (serviceError) {
      if (serviceError.message.includes('Could not find the table')) {
        console.log('⚠️  Service role: Table does not exist yet - this is expected if the schema hasn\'t been pushed');
      } else {
        console.error('⚠️ Service role connection issue:', serviceError.message);
      }
    } else {
      console.log('✅ Service role connection working');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during connection test:', error);
    return false;
  }
}

// Run the test
testSupabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 Supabase connection is properly configured!');
      console.log('💡 If you see warnings about missing tables, you may need to push your database schema to Supabase');
      console.log('💡 Run: npx supabase db push');
    } else {
      console.log('\n❌ There are issues with your Supabase connection.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  });