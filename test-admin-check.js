const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdmin() {
  const email = 'nwosupaul3@gmail.com';
  
  // Check auth.users
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find(u => u.email === email);
  
  console.log('\n📧 User:', email);
  console.log('User exists:', !!user);
  if (user) {
    console.log('User ID:', user.id);
    console.log('JWT role (user_metadata):', user.user_metadata?.role || '(none)');
    console.log('App metadata:', user.app_metadata);
  }
  
  // Check profiles table
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();
      
    console.log('\n📋 Profile:');
    console.log('DB role:', profile?.role || '(none)');
    console.log('Match:', user.user_metadata?.role === profile?.role ? '✅' : '❌');
  }
}

checkAdmin().catch(console.error);
