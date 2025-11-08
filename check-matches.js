const { readFileSync } = require('fs');
const { parse } = require('csv-parse/sync');

// Read the awardee images CSV file
const csvPath = 'public/awardee_images.csv';
const csvContent = readFileSync(csvPath, 'utf-8');

// Parse the CSV content
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
}) ;

console.log('First 10 records from CSV:');
for (let i = 0; i < Math.min(10, records.length); i++) {
  console.log(`${i + 1}. awardee_id: '${records[i].awardee_id}' | image_url: ${records[i].image_url}`);
}

// Check which emails exist in both
console.log('\nChecking for matches...');

const excelEmails = [
  'makuvictor30@gmail.com',
  'blessingegbo391@gmail.com', 
  'adedarajoshua81@gmail.com',
  'peculiaroladejo01@gmail.com',
  'osaghaemagdalene@gmail.com',
  'alimiayomide2019@gmail.com',
  'abuboluwatife19@gmail.com',
  'agbedeolaoluwa@gmail.com',
  'michael.jinadu.mabayomije@gmail.com',
  'busoyetm@gmail.com'
];

let matchCount = 0;
for (const record of records) {
  // The column name might have a trailing space based on the CSV format
  const awardeeId = record['awardee_id ']?.trim() || record['awardee_id']?.trim();
  if (awardeeId && excelEmails.includes(awardeeId.toLowerCase())) {
    console.log(`MATCH FOUND: ${awardeeId}`);
    matchCount++;
  }
}

console.log(`\nTotal email matches found: ${matchCount}`);