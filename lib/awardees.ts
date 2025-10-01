import { createClient } from '@/lib/supabase/server';
import { read, utils } from 'xlsx';

export type Awardee = {
  id: string;
  slug: string;
  name: string;
  email?: string;
  country?: string;
  cgpa?: string | number;
  course?: string;
  bio?: string; // leadership description
  year?: number;
  image_url?: string;
};

// simple slugify
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

// Fetch awardees from Supabase database
export async function getAwardees(): Promise<Awardee[]> {
  try {
    // In the server component, we use the server-side Supabase client
    const supabase = createClient();
    
    // Check if there are any awardees in the database
    const { count, error: countError } = await supabase
      .from('awardees')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting awardees:', countError);
    }
    
    // If no awardees exist in the database, try to initialize from the Excel file
    if (!countError && count === 0) {
      await initializeAwardeesFromExcel();
    }
    
    const { data, error } = await supabase
      .from('awardees')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching awardees:', error);
      throw new Error('Failed to fetch awardees');
    }
    
    return data as Awardee[];
  } catch (error) {
    console.error('Error in getAwardees:', error);
    // Return empty array in case of error, or you could throw the error
    return [];
  }
}

// Initialize awardees from the Excel file
async function initializeAwardeesFromExcel() {
  try {
    const supabase = createClient();
    
    // Try to fetch the Excel file from public directory
    // If running in development, fetch using a relative path
    // If running in production, use the full path
    const excelPath = `/top100 Africa future Leaders 2025.xlsx`;
    const excelResponse = await fetch(excelPath);
    
    if (!excelResponse.ok) {
      console.warn(`Excel file not found at ${excelPath}, skipping initialization`);
      console.warn(`Status: ${excelResponse.status}, Status Text: ${excelResponse.statusText}`);
      return;
    }
    
    const buffer = await excelResponse.arrayBuffer();
    const workbook = read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = utils.sheet_to_json(worksheet);
    
    if (!jsonData || jsonData.length === 0) {
      console.warn('Excel file is empty, skipping initialization');
      return;
    }
    
    // Process the Excel data to match our schema
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

      // Extract country name properly - remove abbreviations like "NG Nigeria", keep only "Nigeria"
      let country = normalizeKey(row, ['country', 'nationality']) || '';
      if (country && typeof country === 'string' && country.includes(' ')) {
        // If it looks like "XX CountryName", extract just the country name
        const parts = country.split(' ');
        if (parts.length >= 2 && parts[0].length === 2) { // Two-letter abbreviation
          country = parts.slice(1).join(' '); // Take everything after the abbreviation
        }
      }
      
      // Extract year properly
      let year = normalizeKey(row, ['year', 'batch']);
      if (typeof year === 'string') {
        year = parseInt(year);
      }

      return {
        id: row.id || `awardee-${index + 1}`,
        name: normalizeKey(row, ['name', 'fullname', 'awardee']) || `Awardee ${index + 1}`,
        email: normalizeKey(row, ['email', 'mail', 'e-mail']) || null,
        country: country || null,
        cgpa: normalizeKey(row, ['cgpa', 'gpa', 'grade']) || null,
        course: normalizeKey(row, ['course', 'program', 'department']) || null,
        bio: normalizeKey(row, ['bio', 'description', 'about', 'leadership', 'bio30']) || null,
        year: year ? parseInt(year.toString()) : 2024,
        slug: generateSlug(normalizeKey(row, ['name', 'fullname', 'awardee']) || `Awardee ${index + 1}`)
      };
    });

    // Insert the data into Supabase
    const { error } = await supabase
      .from('awardees')
      .insert(awardeesToInsert)
      .select();
    
    if (error) {
      console.error('Error initializing awardees from Excel:', error);
      throw error;
    }
    
    console.log(`Successfully initialized ${awardeesToInsert.length} awardees from Excel`);
  } catch (error) {
    console.error('Error during Excel initialization:', error);
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