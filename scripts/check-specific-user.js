const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. CHECK YOUR .env FILE.')
    console.error('URL:', supabaseUrl)
    console.error('Key length:', supabaseKey ? supabaseKey.length : 0)
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser() {
    const email = 'adebolaniyi4@gmail.com'
    const name = 'Adebola Olaniyi'

    console.log(`Checking for user: ${name} (${email})...`)

    const { data: awardees, error: awardeeError } = await supabase
        .from('awardees')
        .select('*')
        .or(`email.eq."${email}",name.ilike."%${name}%"`)

    if (awardeeError) {
        console.error('Error checking awardees:', awardeeError)
    } else if (awardees && awardees.length > 0) {
        console.log('✅ Found in awardees table:')
        awardees.forEach(a => console.log(`- ${a.name} (${a.email})`))
    } else {
        console.log('❌ Not found in awardees table.')
    }

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq."${email}",full_name.ilike."%${name}%"`)

    if (profileError) {
        console.error('Error checking profiles:', profileError)
    } else if (profiles && profiles.length > 0) {
        console.log('✅ Found in profiles table:')
        profiles.forEach(p => console.log(`- ${p.full_name} (${p.email})`))
    } else {
        console.log('❌ Not found in profiles table.')
    }
}

checkUser()
