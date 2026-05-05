const xlsx = require('xlsx');

try {
  const file = 'Onderhoud_Vergelijking.xlsx';
  const workbook = xlsx.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  let match = 0, verschil = 0, inApp = 0, inExcel = 0;
  for(let row of data) {
    if(row['Status'] === 'Match') match++;
    else if(row['Status'] === 'Verschil') verschil++;
    else if(row['Status'] === 'Enkel in App') inApp++;
    else if(row['Status'] === 'Enkel in Excel') inExcel++;
  }
  
  console.log(`Match: ${match}, Verschil: ${verschil}, Enkel in App: ${inApp}, Enkel in Excel: ${inExcel}`);

  console.log("\nItems 'Enkel in App':");
  data.filter(r => r['Status'] === 'Enkel in App').forEach(r => console.log(r['Boei App Naam']));
  
  console.log("\nItems 'Enkel in Excel':");
  data.filter(r => r['Status'] === 'Enkel in Excel').forEach(r => console.log(r['Boei Excel Naam']));

} catch(e) {
  console.error("Error:", e.message);
}
