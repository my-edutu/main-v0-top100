// This script will be used to initialize the Supabase database with Excel data
// It can be run as a one-time setup or as part of the deployment process

import { createClient } from '@supabase/supabase-js';
import { read, utils } from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function initializeDatabaseWithExcel() {
  try {
    console.log('Starting database initialization with Excel data...');
    
    // Read the Excel file
    const excelPath = path.join(process.cwd(), 'public', 'top100 Africa future Leaders 2025.xlsx');
    
    if (!fs.existsSync(excelPath)) {
      console.error('Excel file not found at:', excelPath);
      return;
    }
    
    const fileBuffer = fs.readFileSync(excelPath);
    const workbook = read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = utils.sheet_to_json(worksheet);
    
    if (!jsonData || jsonData.length === 0) {
      console.error('Excel file is empty or invalid');
      return;
    }
    
    console.log(`Found ${jsonData.length} records in Excel file`);
    
    // Transform the data to match our database schema
    const awardeesToInsert = jsonData.map((row: any, index: number) => {
      // Normalize keys to handle different possible column names
      const normalizeKey = (obj: any, keyVariants: string[]): any => {
        for (const variant of keyVariants) {
          const foundKey = Object.keys(obj).find(k => 
            k.toLowerCase().replace(/\s+/g, '').includes(variant.toLowerCase().replace(/\s+/g, ''))
          );
          if (foundKey && obj[foundKey]) {
            return obj[foundKey];
          }
        }
        return null;
      };

      return {
        name: normalizeKey(row, ['name', 'fullname', 'awardee']) || `Awardee ${index + 1}`,
        email: normalizeKey(row, ['email', 'mail', 'e-mail']) || null,
        country: normalizeKey(row, ['country', 'nationality']) || null,
        cgpa: normalizeKey(row, ['cgpa', 'gpa', 'grade']) || null,
        course: normalizeKey(row, ['course', 'program', 'department']) || null,
        bio: normalizeKey(row, ['bio', 'description', 'about', 'leadership']) || null,
        year: parseInt(normalizeKey(row, ['year', 'batch']) || '2024'),
        slug: generateSlug(normalizeKey(row, ['name', 'fullname', 'awardee']) || `Awardee ${index + 1}`)
      };
    });
    
    console.log(`Inserting ${awardeesToInsert.length} records into the database...`);
    
    // Insert the data into Supabase
    const { data, error } = await supabase
      .from('awardees')
      .upsert(awardeesToInsert, {
        onConflict: 'slug', // Update if slug already exists, otherwise insert
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Error inserting awardees:', error);
      return;
    }
    
    console.log(`Successfully inserted/updated ${data?.length || 0} awardees`);
    
    // Also ensure featured YouTube videos are in the database
    const youtubeVideos = [
      {
        title: 'Leadership Summit 2024',
        description: 'Annual gathering of young African leaders discussing innovation and impact',
        video_id: '-gbPMU40-LQ',
        date: 'March 2024'
      },
      {
        title: 'Innovation Workshop',
        description: 'Interactive session on entrepreneurship and technology solutions',
        video_id: 'abSGdFZ3URU',
        date: 'February 2024'
      },
      {
        title: 'Community Impact Forum',
        description: 'Showcasing community-driven projects across Africa',
        video_id: 'dcKQs726FLI',
        date: 'January 2024'
      }
    ];
    
    const { data: youtubeData, error: youtubeError } = await supabase
      .from('youtube_videos')
      .upsert(youtubeVideos, {
        onConflict: 'video_id',
        ignoreDuplicates: false
      });
    
    if (youtubeError) {
      console.error('Error inserting YouTube videos:', youtubeError);
    } else {
      console.log(`Successfully inserted/updated ${youtubeData?.length || 0} YouTube videos`);
    }
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
}

// Helper function to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Run the initialization if this file is executed directly
if (require.main === module) {
  initializeDatabaseWithExcel();
}

export default initializeDatabaseWithExcel;