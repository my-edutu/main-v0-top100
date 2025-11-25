import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { read, utils } from 'xlsx';

/**
 * Converts a Google Drive sharing URL to a direct download URL
 * @param url The Google Drive sharing URL
 * @returns The direct download URL or the original URL if not a Google Drive link
 */
function convertGoogleDriveLinkToDirectDownload(url: string): string {
  try {
    // Check if it's a Google Drive URL
    if (url.includes('drive.google.com')) {
      // Look for the file ID in different URL formats
      let fileId = '';
      
      // Pattern for 'open?id=' URLs
      const openIdMatch = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
      if (openIdMatch) {
        fileId = openIdMatch[1];
      }
      
      // Pattern for 'file/d/' URLs
      const fileDMatch = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileDMatch) {
        fileId = fileDMatch[1];
      }
      
      // Pattern for 'id=' parameter
      const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParamMatch) {
        fileId = idParamMatch[1];
      }
      
      if (fileId) {
        return `https://drive.google.com/uc?id=${fileId}`;
      }
    }
    
    return url;
  } catch (error) {
    console.error(`Error converting Google Drive link: ${url}`, error);
    return url; // Return original URL if conversion fails
  }
}

/**
 * Normalizes a name for comparison by removing extra spaces and converting to lowercase
 * @param name The name to normalize
 * @returns The normalized name
 */
function normalizeName(name: string): string {
  if (!name) return '';
  return name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

/**
 * Checks if two names match (case-insensitive, ignoring extra spaces)
 * @param name1 First name to compare
 * @param name2 Second name to compare
 * @returns True if names match, false otherwise
 */
function namesMatch(name1: string, name2: string): boolean {
  return normalizeName(name1) === normalizeName(name2);
}

/**
 * Process the awardee images CSV and match with existing awardees
 */
async function processAwardeeImageLinks() {
  try {
    // Read the awardee images CSV file
    const csvPath = 'public/awardee_images.csv';
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    // Parse the CSV content
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as Array<{ 'awardee_id '?: string; awardee_id?: string; image_url: string }>;
    
    console.log(`Found ${records.length} records in the CSV file.`);
    
    // Read the Excel file with existing awardees
    const excelPath = 'public/top100 Africa future Leaders 2025.xlsx';
    const buffer = readFileSync(excelPath);
    const workbook = read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = utils.sheet_to_json(worksheet);
    
    console.log(`Found ${jsonData.length} awardees in the Excel file.`);
    
    // Create maps of email and name to awardee from the Excel data
    const emailToAwardeeMap = new Map();
    const nameToAwardeeMap = new Map();
    
    jsonData.forEach((row: any) => {
      // Normalize email to lowercase for comparison
      const email = (row['E-mail'] || row.Email || row.email || '').toString().toLowerCase().trim();
      if (email) {
        emailToAwardeeMap.set(email, row);
      }
      
      // Normalize name for comparison
      const name = row['Name'] || row.name || '';
      if (name) {
        nameToAwardeeMap.set(normalizeName(name), row);
      }
    });
    
    // Process records to match with existing awardees
    const matchedRecords = [];
    
    for (const record of records) {
      // Handle both possible column names due to the trailing space issue
      const awardeeId = ((record['awardee_id '] || record.awardee_id) || '').toString().trim();
      
      // First, try to match by email
      if (awardeeId.includes('@')) {
        const email = awardeeId.toLowerCase().trim();
        if (emailToAwardeeMap.has(email)) {
          matchedRecords.push({ ...record, matchedAwardee: emailToAwardeeMap.get(email) });
          continue;
        }
      }
      
      // If not an email, try to match by name
      if (nameToAwardeeMap.has(normalizeName(awardeeId))) {
        matchedRecords.push({ ...record, matchedAwardee: nameToAwardeeMap.get(normalizeName(awardeeId)) });
      }
    }
    
    console.log(`Found ${matchedRecords.length} matching records between CSV and Excel.`);
    
    // Process the matched records - convert URLs and prepare data
    const processedRecords = matchedRecords.map(record => {
      const awardee = record.matchedAwardee;
      
      // Generate a slug from the name to use as awardee ID
      const name = awardee['Name'] || awardee.name || '';
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      
      return {
        awardee_id: slug || (awardee.id || `awardee-${jsonData.indexOf(awardee) + 1}`), // Use slug as ID or fallback
        name: awardee['Name'] || awardee.name || 'Unknown',
        email: awardee['E-mail'] || awardee.Email || awardee.email || 'Unknown',
        original_image_url: record.image_url,
        converted_image_url: convertGoogleDriveLinkToDirectDownload(record.image_url)
      };
    });
    
    // Output a summary of first few records
    console.log('\nFirst few matched records:');
    processedRecords.slice(0, 10).forEach((record, index) => {
      console.log(`${index + 1}. ${record.name} (${record.email}): ${record.converted_image_url}`);
    });
    
    return processedRecords;
  } catch (error) {
    console.error('Error processing awardee image links:', error);
    throw error;
  }
}

// Run the process if this file is executed directly
if (require.main === module) {
  processAwardeeImageLinks()
    .then((processedRecords) => {
      // Create a CSV output for the import script
      const csvOutput = [
        'awardee_id,image_url',
        ...processedRecords.map(record => 
          `"${record.awardee_id}","${record.converted_image_url}"`
        )
      ].join('\n');
      
      // Write the output CSV to scripts/awardee_images.csv
      // This is the file our import script expects
      const outputPath = 'scripts/awardee_images.csv';
      writeFileSync(outputPath, csvOutput);
      
      console.log(`\nOutput CSV written to: ${outputPath}`);
      console.log(`Total matched records: ${processedRecords.length}`);
      
      // Summary
      console.log('\nProcessing Summary:');
      console.log(`- Total records in input CSV: ${processedRecords.length}`);
      console.log(`- Total awardees in Excel: 418 (from previous analysis)`);
      console.log(`- Matching records found: ${processedRecords.length}`);
      
      console.log('\nAwardee image links processing completed successfully.');
    })
    .catch(error => {
      console.error('Failed to process awardee image links:', error);
    });
}

export default processAwardeeImageLinks;