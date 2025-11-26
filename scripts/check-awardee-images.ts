#!/usr/bin/env tsx
/**
 * Awardee Images Diagnostic Script
 *
 * This script checks the image configuration for awardees and helps identify issues
 * Run: tsx scripts/check-awardee-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Awardee Images Diagnostic Report\n');
console.log('='.repeat(80));

async function checkAwardeeImages() {
  // Check awardees table
  console.log('\n📊 Checking Awardees Table...');
  console.log('-'.repeat(80));

  const { data: awardees, error: awardeesError } = await supabase
    .from('awardees')
    .select('id, name, slug, image_url, avatar_url, featured, is_public')
    .order('name');

  if (awardeesError) {
    console.error('❌ Error fetching awardees:', awardeesError.message);
    return;
  }

  if (!awardees || awardees.length === 0) {
    console.log('⚠️  No awardees found in database');
    return;
  }

  console.log(`✅ Found ${awardees.length} total awardees`);

  // Analyze image fields
  const stats = {
    total: awardees.length,
    withImageUrl: 0,
    withAvatarUrl: 0,
    withEitherImage: 0,
    withoutAnyImage: 0,
    featured: 0,
    featuredWithImages: 0,
    public: 0,
    publicWithImages: 0,
  };

  const awardeesWithoutImages: any[] = [];
  const featuredAwardees: any[] = [];

  awardees.forEach((awardee) => {
    const hasImageUrl = !!awardee.image_url;
    const hasAvatarUrl = !!awardee.avatar_url;
    const hasAnyImage = hasImageUrl || hasAvatarUrl;

    if (hasImageUrl) stats.withImageUrl++;
    if (hasAvatarUrl) stats.withAvatarUrl++;
    if (hasAnyImage) stats.withEitherImage++;
    if (!hasAnyImage) {
      stats.withoutAnyImage++;
      awardeesWithoutImages.push(awardee);
    }

    if (awardee.featured) {
      stats.featured++;
      featuredAwardees.push(awardee);
      if (hasAnyImage) stats.featuredWithImages++;
    }

    if (awardee.is_public) {
      stats.public++;
      if (hasAnyImage) stats.publicWithImages++;
    }
  });

  console.log('\n📈 Image Statistics:');
  console.log(`   Total awardees: ${stats.total}`);
  console.log(`   With image_url: ${stats.withImageUrl} (${((stats.withImageUrl / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   With avatar_url: ${stats.withAvatarUrl} (${((stats.withAvatarUrl / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   With any image: ${stats.withEitherImage} (${((stats.withEitherImage / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   Without images: ${stats.withoutAnyImage} (${((stats.withoutAnyImage / stats.total) * 100).toFixed(1)}%)`);

  console.log('\n⭐ Featured Awardees:');
  console.log(`   Total featured: ${stats.featured}`);
  console.log(`   Featured with images: ${stats.featuredWithImages}`);
  console.log(`   Featured without images: ${stats.featured - stats.featuredWithImages}`);

  if (stats.featured > 0 && stats.featuredWithImages === 0) {
    console.log('   ⚠️  WARNING: Featured awardees have NO images - homepage will show placeholders!');
  }

  console.log('\n🌐 Public Awardees:');
  console.log(`   Total public: ${stats.public}`);
  console.log(`   Public with images: ${stats.publicWithImages}`);

  // Show awardees without images
  if (awardeesWithoutImages.length > 0) {
    console.log('\n⚠️  Awardees Without Images:');
    console.log('-'.repeat(80));
    awardeesWithoutImages.slice(0, 10).forEach((awardee, index) => {
      console.log(`   ${index + 1}. ${awardee.name} (${awardee.slug})`);
      console.log(`      Featured: ${awardee.featured ? '✓' : '✗'} | Public: ${awardee.is_public ? '✓' : '✗'}`);
    });
    if (awardeesWithoutImages.length > 10) {
      console.log(`   ... and ${awardeesWithoutImages.length - 10} more`);
    }
  }

  // Show featured awardees
  if (featuredAwardees.length > 0) {
    console.log('\n⭐ Featured Awardees (shown on homepage):');
    console.log('-'.repeat(80));
    featuredAwardees.forEach((awardee, index) => {
      const hasImage = !!(awardee.image_url || awardee.avatar_url);
      const imageIcon = hasImage ? '🖼️' : '❌';
      console.log(`   ${imageIcon} ${awardee.name}`);
      if (awardee.image_url) console.log(`      image_url: ${awardee.image_url.substring(0, 60)}...`);
      if (awardee.avatar_url) console.log(`      avatar_url: ${awardee.avatar_url.substring(0, 60)}...`);
      if (!hasImage) console.log(`      ⚠️  No image - will show placeholder`);
    });
  }

  // Check awardee_directory view
  console.log('\n📋 Checking Awardee Directory View...');
  console.log('-'.repeat(80));

  const { data: directoryData, error: directoryError } = await supabase
    .from('awardee_directory')
    .select('awardee_id, name, avatar_url, cover_image_url, featured')
    .eq('featured', true)
    .limit(5);

  if (directoryError) {
    console.error('❌ Error fetching from awardee_directory view:', directoryError.message);
  } else if (directoryData) {
    console.log(`✅ Awardee directory view is accessible`);
    console.log(`   Sample featured entries: ${directoryData.length}`);
    directoryData.forEach((entry) => {
      const hasAvatar = !!entry.avatar_url;
      const hasCover = !!entry.cover_image_url;
      console.log(`   ${hasAvatar ? '🖼️' : '❌'} ${entry.name}`);
      console.log(`      avatar_url: ${entry.avatar_url ? '✓' : '✗'} | cover_image_url: ${hasCover ? '✓' : '✗'}`);
    });
  }

  // Check storage buckets
  console.log('\n🗄️  Checking Storage Buckets...');
  console.log('-'.repeat(80));

  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
    } else if (buckets) {
      console.log(`✅ Found ${buckets.length} storage buckets`);

      const relevantBuckets = buckets.filter(b =>
        b.name.includes('awardee') ||
        b.name.includes('avatar') ||
        b.name.includes('upload') ||
        b.name.includes('image')
      );

      if (relevantBuckets.length > 0) {
        relevantBuckets.forEach(bucket => {
          console.log(`   📦 ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
        });
      } else {
        console.log('   ⚠️  No image-related buckets found (awardees, avatars, uploads)');
        console.log('   All buckets:', buckets.map(b => b.name).join(', '));
      }
    }
  } catch (error) {
    console.error('❌ Error checking storage:', error);
  }
}

async function generateRecommendations(stats: any) {
  console.log('\n💡 Recommendations:');
  console.log('='.repeat(80));

  if (stats.withoutAnyImage > 0) {
    console.log('\n1. Upload Missing Images:');
    console.log('   Some awardees don\'t have images. To add images:');
    console.log('   - Go to /admin/awardees');
    console.log('   - Click "Edit" on an awardee');
    console.log('   - Upload an image in the image field');
    console.log('   - Save changes');
  }

  if (stats.featured > 0 && stats.featuredWithImages < stats.featured) {
    console.log('\n2. Featured Awardees Without Images:');
    console.log('   Some featured awardees don\'t have images!');
    console.log('   These will show placeholders on the homepage.');
    console.log('   Priority: Upload images for featured awardees first.');
  }

  console.log('\n3. Image Field Names:');
  console.log('   Your awardees table supports TWO image fields:');
  console.log('   - image_url: Main awardee image');
  console.log('   - avatar_url: Profile avatar image');
  console.log('   The system uses whichever is available (avatar_url preferred)');

  console.log('\n4. Storage Bucket Configuration:');
  console.log('   Make sure your Supabase storage bucket:');
  console.log('   - Exists (create "awardees" or "uploads" bucket)');
  console.log('   - Is set to PUBLIC for image viewing');
  console.log('   - Has proper CORS settings for your domain');

  console.log('\n5. Image Display:');
  console.log('   ✓ Homepage: Uses avatar_url from awardee_directory view');
  console.log('   ✓ /awardees page: Uses cover_image_url OR avatar_url (fallback)');
  console.log('   ✓ Fallback: SVG avatars generated for missing images');
}

// Run diagnostics
checkAwardeeImages()
  .then(() => {
    console.log('\n' + '='.repeat(80));
    console.log('✅ Diagnostic Complete');
    console.log('='.repeat(80) + '\n');
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  });
