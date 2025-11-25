import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateFeaturedAwardees() {
  console.log('Updating featured awardees in Supabase...\n')

  const featuredEmails = [
    'Dabiodun50@gmail.com',
    'babarindeolajide88@gmail.com',
    'raheemahoyiza96@gmail.com',
    'onofioklillian@gmail.com',
    'emmanuelstephen024@gmail.com',
    'nimatmohammed2000@gmail.com'
  ]

  const featuredNames = [
    'Abiodun Damilola',
    'Babarinde Taofeek Olajide',
    'Raheemat Oyiza Muhammad',
    'Onofiok Lillian Okpo',
    'Stephen Emmanuel',
    'Mohammed Nimat Oyiza'
  ]

  // First, set all awardees to featured = false
  const { error: resetError } = await supabase
    .from('awardees')
    .update({ featured: false })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

  if (resetError) {
    console.error('Error resetting featured status:', resetError)
  } else {
    console.log('✓ Reset all awardees to featured = false')
  }

  // Update each featured awardee
  let successCount = 0

  for (const email of featuredEmails) {
    const { data, error } = await supabase
      .from('awardees')
      .update({ featured: true })
      .eq('email', email)
      .select()

    if (error) {
      console.error(`✗ Error updating ${email}:`, error.message)
    } else if (data && data.length > 0) {
      console.log(`✓ Marked as featured: ${data[0].name}`)
      successCount++
    } else {
      console.log(`⚠ Not found in database: ${email}`)
    }
  }

  console.log(`\n✅ Successfully updated ${successCount} out of ${featuredEmails.length} awardees`)

  // Verify the update
  const { data: featuredAwardees, error: verifyError } = await supabase
    .from('awardees')
    .select('name, email, featured')
    .eq('featured', true)

  if (verifyError) {
    console.error('Error verifying featured awardees:', verifyError)
  } else {
    console.log('\nCurrently featured awardees in database:')
    featuredAwardees?.forEach((awardee, i) => {
      console.log(`${i + 1}. ${awardee.name} (${awardee.email})`)
    })
  }
}

updateFeaturedAwardees()
  .then(() => {
    console.log('\n✅ Update complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
