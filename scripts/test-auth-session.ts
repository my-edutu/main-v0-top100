import { createClient } from '@supabase/supabase-js'
import jwtDecode from 'jwt-decode'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('\n🔐 AUTH SESSION TEST - ENHANCED')
console.log('='.repeat(80))

console.log('\n1️⃣ Environment Variables Check:')
console.log('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl ? '✅' : '❌')
console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey ? '✅' : '❌')
console.log('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey ? '✅' : '❌')

const email = 'nwosupaul3@gmail.com'
const password = 'test123'

async function testAuth() {
  // Create client with anon key (like client does)
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('\n2️⃣ Testing Sign In...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message)
    console.log('\n⚠️  If password is wrong, try resetting it in Supabase Dashboard')
    return
  }

  console.log('✅ Sign in successful!')
  console.log('   User ID:', signInData.user?.id)
  console.log('   Email:', signInData.user?.email)
  console.log('   Session exists:', !!signInData.session)

  // STEP 3: Decode JWT token to inspect claims
  console.log('\n3️⃣ Decoding JWT Token (Server-Side View)...')
  if (signInData.session?.access_token) {
    const decoded = jwtDecode(signInData.session.access_token) as any

    console.log('   Token decoded successfully!')
    console.log('   Subject (user ID):', decoded.sub)
    console.log('   Email:', decoded.email)
    console.log('   Issued at:', new Date(decoded.iat * 1000).toISOString())
    console.log('   Expires at:', new Date(decoded.exp * 1000).toISOString())

    // Check for role in various locations
    const possibleRoles = {
      'role (direct)': decoded.role,
      'user_metadata.role': decoded.user_metadata?.role,
      'app_metadata.role': decoded.app_metadata?.role,
      'custom:role': decoded['custom:role'],
    }

    console.log('\n   🔍 Searching for role in JWT claims:')
    let foundRole = false
    for (const [location, value] of Object.entries(possibleRoles)) {
      if (value) {
        console.log(`   ✅ Found in ${location}:`, value)
        foundRole = true
      } else {
        console.log(`   ❌ Not in ${location}`)
      }
    }

    if (!foundRole) {
      console.log('\n   ⚠️  WARNING: No role found in JWT token!')
      console.log('   This is the ROOT CAUSE of the "can view but cannot act" bug.')
      console.log('   The JWT does not contain role information.')
    }

    console.log('\n   📋 Full JWT payload:')
    console.log(JSON.stringify(decoded, null, 2))
  } else {
    console.log('   ❌ No access token in session')
  }

  // STEP 4: Check profile with service role (like server does)
  console.log('\n4️⃣ Checking Profile with Service Role (Database View)...')
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, email, Email, full_name')
    .eq('id', signInData.user?.id)
    .maybeSingle()

  if (profileError) {
    console.error('❌ Profile fetch error:', profileError)
    return
  }

  if (!profile) {
    console.log('❌ No profile found in database')
    return
  }

  const profileEmail = profile.email || profile.Email
  console.log('✅ Profile found in database!')
  console.log('   Role:', profile.role)
  console.log('   Email:', profileEmail)
  console.log('   Full name:', profile.full_name)
  console.log('   Has admin role:', profile.role === 'admin' ? '✅ YES' : '❌ NO')

  // STEP 5: Compare JWT role with DB role
  console.log('\n5️⃣ Comparing JWT vs Database Role...')

  const decoded = jwtDecode(signInData.session!.access_token) as any
  const jwtRole =
    decoded.role ||
    decoded.user_metadata?.role ||
    decoded.app_metadata?.role ||
    decoded['custom:role'] ||
    null

  const dbRole = profile.role

  console.log('   JWT Role:', jwtRole || '(none)')
  console.log('   DB Role:', dbRole)

  if (jwtRole === dbRole) {
    console.log('   ✅ Roles match!')
  } else {
    console.log('   🔥 ROLE MISMATCH DETECTED!')
    console.log('   This is why you can view /admin but cannot perform actions.')
    console.log('   The middleware checks DB (sees admin) but API checks JWT (sees none or different).')
  }

  // STEP 6: Simulate middleware logic
  console.log('\n6️⃣ Simulating Middleware Logic...')
  const hasAdminRoleInDB = profile && profile.role === 'admin'

  if (hasAdminRoleInDB) {
    console.log('✅ MIDDLEWARE: Would allow access to /admin routes (DB check)')
  } else {
    console.log('❌ MIDDLEWARE: Would deny access to /admin routes')
  }

  // STEP 7: Simulate API guard logic (old vs new)
  console.log('\n7️⃣ Simulating API Guard Logic...')

  console.log('\n   OLD requireAdmin (before fix):')
  console.log('   - Checks Supabase session')
  console.log('   - Queries DB for role')
  console.log('   - Result:', hasAdminRoleInDB ? '✅ Would authorize (DB check)' : '❌ Would deny')

  console.log('\n   NEW requireAdmin (after fix):')
  console.log('   - First checks JWT for role')
  console.log('   - JWT role:', jwtRole || '(none)')
  console.log('   - Falls back to DB if JWT missing role')
  console.log('   - DB role:', dbRole)
  console.log('   - Result:', hasAdminRoleInDB ? '✅ Would authorize (DB fallback)' : '❌ Would deny')

  if (jwtRole !== dbRole) {
    console.log('\n   ⚠️  RECOMMENDATION: User should sign out and sign in again')
    console.log('      This will refresh the JWT token with the correct role.')
  }

  console.log('\n' + '='.repeat(80))
  console.log('💡 DIAGNOSIS & RECOMMENDATIONS:')
  console.log('\nCurrent State:')
  console.log(`   - JWT contains role: ${!!jwtRole ? '✅ YES (' + jwtRole + ')' : '❌ NO'}`)
  console.log(`   - Database role: ${dbRole}`)
  console.log(`   - Roles match: ${jwtRole === dbRole ? '✅ YES' : '❌ NO'}`)

  console.log('\nIf you still cannot access /admin after these fixes:')
  console.log('1. Clear browser cookies (all cookies for localhost)')
  console.log('2. Sign out completely')
  console.log('3. Restart Next.js dev server (Ctrl+C and npm run dev)')
  console.log('4. Sign in again (this will generate a fresh JWT)')
  console.log('5. Check browser console for [requireAdmin] logs')
  console.log('6. Check server terminal for authorization decisions')

  console.log('\nTo update user role in Supabase:')
  console.log('1. Go to Supabase Dashboard → Authentication → Users')
  console.log('2. Click on the user')
  console.log('3. In "User Metadata" or "App Metadata", add: { "role": "admin" }')
  console.log('4. Save changes')
  console.log('5. User must sign out and sign in again to get new JWT')

  console.log('\nOR update via SQL:')
  console.log(`UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'::jsonb WHERE id = '${signInData.user?.id}';`)
  console.log(`UPDATE profiles SET role = 'admin' WHERE id = '${signInData.user?.id}';`)

  console.log('\n')
}

testAuth().catch(console.error)
