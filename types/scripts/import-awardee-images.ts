import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { processAwardeesWithImageLinks } from '@/lib/imageDownloadUpload';
import dotenv from 'dotenv';

// Load environment variables explicitly
dotenv.config({ path: '../.env.local' });

async function importAwardeeImages() {
  // Check if environment variables are properly loaded
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');

  try {
    // Read the CSV file
    const csvPath = 'scripts/awardee_images.csv';
    const csvContent = readFileSync(csvPath, 'utf-8');

    // Parse the CSV content
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as Array<{ awardee_id: string; image_url: string }>;

    if (records.length === 0) {
      console.log('No records found in the CSV file.');
      return;
    }

    console.log(`Found ${records.length} awardee image records to process.`);

    // Prepare the data for processing
    const awardeeImageLinks = records.map(record => ({
      awardeeId: record.awardee_id,
      imageUrl: record.image_url
    }));

    // Process the images
    const { successCount, failureCount } = await processAwardeesWithImageLinks(awardeeImageLinks);

    console.log(`\nProcessing complete!`);
    console.log(`Successful uploads: ${successCount}`);
    console.log(`Failed uploads: ${failureCount}`);
  } catch (error) {
    console.error('Error importing awardee images:', error);
  }
}

// Run the import if this file is executed directly
if (require.main === module) {
  importAwardeeImages();
}

export default importAwardeeImages;