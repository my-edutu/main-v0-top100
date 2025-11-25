const { read, utils } = require('xlsx');
const fs = require('fs');
const path = require('path');

async function examineExcel() {
  try {
    const excelPath = path.join(process.cwd(), 'public', 'top100 Africa future Leaders 2025.xlsx');

    console.log('Reading Excel file from:', excelPath);

    const buffer = fs.readFileSync(excelPath);
    const workbook = read(buffer, { type: 'buffer' });

    console.log('\n=== EXCEL FILE STRUCTURE ===\n');
    console.log('Sheet Names:', workbook.SheetNames);

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = utils.sheet_to_json(worksheet);

    console.log('\nTotal rows:', jsonData.length);

    if (jsonData.length > 0) {
      console.log('\n=== COLUMN HEADERS ===\n');
      console.log(Object.keys(jsonData[0]));

      console.log('\n=== FIRST 3 ROWS (SAMPLE DATA) ===\n');
      jsonData.slice(0, 3).forEach((row, index) => {
        console.log(`\n--- Row ${index + 1} ---`);
        console.log(JSON.stringify(row, null, 2));
      });
    }

    console.log('\n=== ANALYSIS COMPLETE ===\n');
  } catch (error) {
    console.error('Error examining Excel file:', error);
  }
}

examineExcel();
