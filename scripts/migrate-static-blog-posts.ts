import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { blogPosts } from '../content/data/blog-posts'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Convert blog content blocks to HTML
const renderBlockToHtml = (block: any): string => {
  switch (block.type) {
    case 'heading':
      return `<h2>${block.text}</h2>`
    case 'paragraph':
      return `<p>${block.text}</p>`
    case 'list': {
      const items = block.items.map((item: string) => `<li>${item}</li>`).join('')
      const intro = block.intro ? `<p>${block.intro}</p>` : ''
      return `${intro}<ul>${items}</ul>`
    }
    case 'cta':
      if (block.href) {
        return `<p><a href="${block.href}">${block.text}</a></p>`
      }
      return `<p>${block.text}</p>`
    default:
      return ''
  }
}

async function migrateStaticPosts() {
  console.log('\n🚀 Starting migration of static blog posts...\n')

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const post of blogPosts) {
    try {
      // Check if post already exists
      const { data: existing } = await supabase
        .from('posts')
        .select('id, slug')
        .eq('slug', post.slug)
        .maybeSingle()

      if (existing) {
        console.log(`⏭️  Skipping "${post.title}" - already exists in database`)
        skipCount++
        continue
      }

      // Convert content blocks to HTML
      const contentHtml = post.content.map(renderBlockToHtml).join('\n')

      // Prepare post data for database
      const postData = {
        title: post.title,
        slug: post.slug,
        content: contentHtml,
        excerpt: post.excerpt,
        author: post.author,
        cover_image: post.coverImage || null,
        cover_image_alt: null,
        is_featured: post.isFeatured,
        status: post.status,
        tags: post.tags,
        read_time: post.readTime,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
      }

      // Insert into database
      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single()

      if (error) {
        console.error(`❌ Error migrating "${post.title}":`, error.message)
        errorCount++
        continue
      }

      console.log(`✅ Successfully migrated: "${post.title}"`)
      successCount++
    } catch (error) {
      console.error(`❌ Unexpected error migrating "${post.title}":`, error)
      errorCount++
    }
  }

  console.log('\n📊 Migration Summary:')
  console.log(`   ✅ Successfully migrated: ${successCount}`)
  console.log(`   ⏭️  Skipped (already exist): ${skipCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log(`   📝 Total static posts: ${blogPosts.length}\n`)

  if (successCount > 0) {
    console.log('🎉 Migration completed! The posts are now available in your admin panel.\n')
  }
}

// Run migration
migrateStaticPosts()
  .then(() => {
    console.log('✨ Script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
