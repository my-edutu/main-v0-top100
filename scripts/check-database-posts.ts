import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkPosts() {
  console.log('📊 Fetching all posts from database...\n')

  const { data, error } = await supabase
    .from('posts')
    .select('id, title, slug, status, is_featured, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching posts:', error)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No posts found in database')
    return
  }

  console.log(`✅ Found ${data.length} posts in database:\n`)

  data.forEach((post, index) => {
    console.log(`${index + 1}. "${post.title}"`)
    console.log(`   Slug: ${post.slug}`)
    console.log(`   Status: ${post.status}`)
    console.log(`   Featured: ${post.is_featured ? 'Yes' : 'No'}`)
    console.log(`   Created: ${new Date(post.created_at).toLocaleDateString()}`)
    console.log('')
  })

  console.log(`\n📈 Summary:`)
  console.log(`   Total posts: ${data.length}`)
  console.log(`   Published: ${data.filter(p => p.status === 'published').length}`)
  console.log(`   Draft: ${data.filter(p => p.status === 'draft').length}`)
  console.log(`   Featured: ${data.filter(p => p.is_featured).length}`)
}

checkPosts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error:', error)
    process.exit(1)
  })
