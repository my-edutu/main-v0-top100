// Script to migrate hardcoded YouTube videos to the database
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env.local file.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Fallback videos from the homepage
const fallbackVideos = [
  {
    video_id: "-gbPMU40-LQ",
    title: "Leadership Summit 2024",
    description: "Annual gathering of young African leaders discussing innovation and impact",
    date: "March 2024",
  },
  {
    video_id: "abSGdFZ3URU",
    title: "Innovation Workshop",
    description: "Interactive session on entrepreneurship and technology solutions",
    date: "February 2024",
  },
  {
    video_id: "dcKQs726FLI",
    title: "Community Impact Forum",
    description: "Showcasing community-driven projects across Africa",
    date: "January 2024",
  },
  {
    video_id: "AJjsyO9ff8g",
    title: "Awards Ceremony Highlights",
    description: "Celebrating outstanding achievements of young African leaders",
    date: "December 2023",
  },
];

async function migrateVideos() {
  console.log('🎬 Starting YouTube videos migration...\n');

  // First, check if videos already exist
  const { data: existingVideos, error: fetchError } = await supabase
    .from('youtube_videos')
    .select('video_id');

  if (fetchError) {
    console.error('❌ Error fetching existing videos:', fetchError.message);
    process.exit(1);
  }

  const existingVideoIds = new Set(
    existingVideos?.map(v => v.video_id) || []
  );

  console.log(`📊 Found ${existingVideoIds.size} existing videos in database`);

  // Filter out videos that already exist
  const videosToInsert = fallbackVideos.filter(
    v => !existingVideoIds.has(v.video_id)
  );

  if (videosToInsert.length === 0) {
    console.log('✅ All videos already exist in the database. No migration needed.');
    return;
  }

  console.log(`📥 Inserting ${videosToInsert.length} new videos...\n`);

  // Insert videos one by one to handle errors gracefully
  let successCount = 0;
  let errorCount = 0;

  for (const video of videosToInsert) {
    const { error } = await supabase
      .from('youtube_videos')
      .insert([video]);

    if (error) {
      console.error(`❌ Failed to insert video "${video.title}":`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Inserted: ${video.title} (${video.video_id})`);
      successCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successfully inserted: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total videos in database: ${existingVideoIds.size + successCount}`);

  if (successCount > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 You can now manage these videos from the admin panel at /admin/youtube');
  }
}

migrateVideos().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
