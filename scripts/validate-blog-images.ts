// scripts/validate-blog-images.ts

import { createClient } from '@supabase/supabase-js';

// This script validates that the blog image upload system is properly configured
async function validateBlogImageSystem() {
  console.log('🔍 Validating blog image upload system...\n');

  // 1. Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUploadsBucket = process.env.SUPABASE_UPLOADS_BUCKET || 'uploads';

  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    return false;
  }

  if (!supabaseAnonKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    return false;
  }

  if (!supabaseServiceRoleKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    return false;
  }

  console.log('✅ Environment variables are set');
  console.log(`   - SUPABASE_URL: ${supabaseUrl.replace(/(\/\/)(.*)(@)/, '$1***$3')}`); // Hide sensitive part
  console.log(`   - Uploads bucket: ${supabaseUploadsBucket}\n`);

  // 2. Check if Supabase storage bucket exists
  console.log('Checking if storage bucket exists...');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // List all buckets to check if our target bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing storage buckets:', bucketsError.message);
      return false;
    }

    const targetBucket = buckets?.find(bucket => bucket.name === supabaseUploadsBucket);

    if (!targetBucket) {
      console.error(`❌ Storage bucket '${supabaseUploadsBucket}' does not exist.`);
      console.log(`💡 Please create a storage bucket named '${supabaseUploadsBucket}' in your Supabase dashboard.`);
      return false;
    }

    console.log(`✅ Storage bucket '${supabaseUploadsBucket}' exists\n`);
    console.log('Bucket details:');
    console.log(`   - Name: ${targetBucket.name}`);
    console.log(`   - Public: ${targetBucket.public ? 'Yes' : 'No'}`);
    console.log(`   - File size limit: ${targetBucket.file_size_limit} bytes`);
    console.log(`   - Allowed mime types: ${targetBucket.allowed_mime_types?.join(', ') || 'All'}\n`);

    // 3. Check if there are any blog posts with images
    console.log('Checking for blog posts with images...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, cover_image')
      .not('cover_image', 'is', null);

    if (postsError) {
      console.error('❌ Error fetching blog posts:', postsError.message);
      return false;
    }

    if (posts && posts.length > 0) {
      console.log(`✅ Found ${posts.length} blog post(s) with images:\n`);
      posts.forEach(post => {
        console.log(`   - "${post.title}" (ID: ${post.id})`);
        console.log(`     Image URL: ${post.cover_image}\n`);
      });
    } else {
      console.log('ℹ️  No blog posts with images found (this might be normal if no posts have been created yet)');
    }

    // 4. Check if any blog posts exist at all
    const { count, error: countError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting blog posts:', countError.message);
      return false;
    }

    console.log(`📊 Total blog posts in database: ${count || 0}\n`);

    console.log('🎉 Blog image upload system validation completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Environment: ✅ Configured with ${supabaseUploadsBucket} bucket`);
    console.log(`   - Storage bucket: ✅ Exists and accessible`);
    console.log(`   - Blog posts: ${count ? '✅ Found' : 'ℹ️  None yet'}`);
    console.log(`   - Posts with images: ${posts && posts.length ? `✅ ${posts.length} found` : 'ℹ️  None yet'}`);

    return true;
  } catch (error: any) {
    console.error('❌ Unexpected error during validation:', error.message);
    return false;
  }
}

// Run the validation
if (require.main === module) {
  validateBlogImageSystem()
    .then(success => {
      if (success) {
        console.log('\n✅ Validation successful! Your blog image upload system is properly configured.');
        process.exit(0);
      } else {
        console.log('\n❌ Validation failed! Please check the above errors and fix them.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Validation script failed with error:', error);
      process.exit(1);
    });
}

export { validateBlogImageSystem };