const { readFileSync } = require('fs');
const { read, utils } = require('xlsx');

const excelPath = 'public/top100 Africa future Leaders 2025.xlsx';
const buffer = readFileSync(excelPath);
const workbook = read(buffer, { type: 'buffer' });
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const jsonData = utils.sheet_to_json(worksheet);

console.log('First 10 names in Excel file:');
jsonData.slice(0, 10).forEach((row, index) => {
  console.log(`${index + 1}. Name: '${row['Name']}' | Email: '${row['E-mail']}'`);
});

console.log('\nColumn names in Excel:');
console.log(Object.keys(jsonData[0]));