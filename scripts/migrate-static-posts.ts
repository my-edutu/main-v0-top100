import { createClient } from '@supabase/supabase-js'
import { blogPosts } from '../content/data/blog-posts'

// This script migrates static blog posts to Supabase
// Run this once to import static content into the database
async function migrateStaticPosts() {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    }
  })

  console.log('Starting static blog posts migration...')

  // Transform static posts to match database schema
  const postsToInsert = blogPosts.map(post => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: JSON.stringify(post.content), // Store content as JSON string
    excerpt: post.excerpt,
    cover_image: post.coverImage,
    author: post.author,
    tags: post.tags,
    read_time: post.readTime,
    is_featured: post.isFeatured,
    status: post.status,
    created_at: post.createdAt,
    updated_at: post.updatedAt
  }))

  // Insert posts into database
  for (const post of postsToInsert) {
    const { data, error } = await supabase
      .from('posts')
      .insert([post])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        console.log(`Post with slug "${post.slug}" already exists, skipping...`)
      } else {
        console.error(`Error inserting post "${post.title}":`, error)
      }
    } else {
      console.log(`Successfully migrated post: ${post.title}`)
    }
  }

  console.log('Static blog posts migration completed!')
}

// Run the migration
migrateStaticPosts().catch(console.error)