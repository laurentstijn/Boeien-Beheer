const xlsx = require('xlsx');

const file = 'jobs-boeien.xlsx';

try {
  const workbook = xlsx.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  console.log(`=== ${file} - Sheet: ${sheetName} ===`);
  console.log(data.slice(0, 5)); // print first 5
  console.log("Total rows:", data.length);
} catch (e) {
  console.error(`Error reading ${file}:`, e.message);
}
