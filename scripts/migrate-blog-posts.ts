/**
 * Migrate static blog posts from content/data/blog-posts.ts to database
 *
 * Run with: npx tsx scripts/migrate-blog-posts.ts
 */

import { createClient } from '@supabase/supabase-js'
import { blogPosts } from '../content/data/blog-posts'

async function migrateBlogPosts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing environment variables')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('🚀 Starting blog post migration...')
  console.log(`📝 Found ${blogPosts.length} static blog posts to migrate\n`)

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  // Convert blog post content blocks to HTML
  const convertContentToHtml = (blocks: any[]): string => {
    return blocks.map(block => {
      switch (block.type) {
        case 'heading':
          return `<h2>${block.text}</h2>`
        case 'paragraph':
          return `<p>${block.text}</p>`
        case 'list': {
          const intro = block.intro ? `<p>${block.intro}</p>` : ''
          const items = block.items.map((item: string) => `<li>${item}</li>`).join('')
          return `${intro}<ul>${items}</ul>`
        }
        case 'cta':
          if (block.href) {
            return `<p><a href="${block.href}" class="cta-link">${block.text}</a></p>`
          }
          return `<p class="cta-text"><strong>${block.text}</strong></p>`
        default:
          return ''
      }
    }).join('\n')
  }

  let migratedCount = 0
  let skippedCount = 0

  for (const post of blogPosts) {
    try {
      // Check if post already exists by slug
      const { data: existing } = await supabase
        .from('posts')
        .select('id, slug')
        .eq('slug', post.slug)
        .maybeSingle()

      if (existing) {
        console.log(`⏭️  Skipping "${post.title}" - already exists`)
        skippedCount++
        continue
      }

      // Convert content blocks to HTML
      const contentHtml = convertContentToHtml(post.content)

      // Calculate read time from content
      const plainText = contentHtml.replace(/<[^>]+>/g, ' ')
      const words = plainText.split(/\s+/).filter(Boolean).length
      const readTime = Math.max(1, Math.round(words / 180))

      // Prepare post data for database
      const postData = {
        title: post.title,
        slug: post.slug,
        content: contentHtml,
        cover_image: post.coverImage?.includes('placeholder') ? null : post.coverImage,
        author: post.author,
        excerpt: post.excerpt,
        tags: post.tags,
        read_time: readTime,
        is_featured: post.isFeatured,
        status: post.status,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
      }

      // Insert into database
      const { error } = await supabase
        .from('posts')
        .insert([postData])

      if (error) {
        console.error(`❌ Error migrating "${post.title}":`, error.message)
        continue
      }

      console.log(`✅ Migrated: "${post.title}"`)
      migratedCount++

    } catch (error) {
      console.error(`❌ Unexpected error with "${post.title}":`, error)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✨ Migration complete!`)
  console.log(`   ✅ Migrated: ${migratedCount} posts`)
  console.log(`   ⏭️  Skipped: ${skippedCount} posts (already exist)`)
  console.log(`   📊 Total: ${blogPosts.length} posts processed`)
  console.log('='.repeat(60))
  console.log('\n🎉 Your blog posts are now editable in the admin portal!')
  console.log('   Visit: /admin/blog to manage them\n')
}

migrateBlogPosts().catch(error => {
  console.error('💥 Migration failed:', error)
  process.exit(1)
})
