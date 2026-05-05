const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function excelDateToJSDate(excelDate) {
  if (!excelDate) return null;
  return new Date((excelDate - 25569) * 86400 * 1000);
}

async function run() {
  const file = 'jobs-boeien.xlsx';
  const workbook = xlsx.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  const excelDataMap = new Map();
  for (const row of data) {
    const name = String(row['Naam Boei']).trim();
    const lastMaintenanceExcel = row['Laatste onderhoud'];
    const daysRemaining = row['Dagen Tegoed'];
    const jsDate = excelDateToJSDate(lastMaintenanceExcel);
    excelDataMap.set(name, {
      lastMaintenanceDate: jsDate,
      daysRemaining: daysRemaining,
      raw: row
    });
  }

  const { data: dbBuoys, error } = await supabase
    .from('deployed_buoys')
    .select('id, name, status, metadata');

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  const { data: logs, error: logsError } = await supabase
    .from('maintenance_logs')
    .select('deployed_buoy_id, service_date')
    .order('service_date', { ascending: false });

  if (logsError) {
    console.error("Logs Error:", logsError);
    return;
  }

  const latestLogMap = new Map();
  for (const log of logs) {
    if (!latestLogMap.has(log.deployed_buoy_id)) {
      latestLogMap.set(log.deployed_buoy_id, new Date(log.service_date));
    }
  }

  const results = [];
  const processedExcelNames = new Set();
  const manualMapping = {
    'RHD-O': 'Rodehuizendok Oost',
    'RHD-W': 'Rodehuizendok West',
    'RIEME N gent': 'Rieme Noord',
    'RIEME Z gent': 'Rieme Zuid',
    'SOD-2': 'S.O.D 2',
    'SOD-4': 'S.O.D 4',
    'SOD-6': 'S.O.D 6',
    'STA-3': 'St-Anna 3',
    'YN': 'Y-NOORD',
    'ZZ1': 'ZZ 1 zwaaizone cruise schepen',
    'ZZ2': 'ZZ 2 zwaaizone cruiseschepen',
    'R 1': 'R1'
  };

  for (const buoy of dbBuoys) {
    const buoyName = buoy.name;
    let mappedName = manualMapping[buoyName] || buoyName;
    let excelRecord = excelDataMap.get(mappedName);
    let matchedExcelName = mappedName;
    
    if (!excelRecord) {
      for (const [key, value] of excelDataMap.entries()) {
        if (mappedName.includes(key) || key.includes(mappedName)) {
           excelRecord = value;
           matchedExcelName = key;
           break;
        }
      }
    }

    const dbLatestLogDate = latestLogMap.get(buoy.id) || null;
    let dbMetadataDate = buoy.metadata?.last_maintenance ? new Date(buoy.metadata.last_maintenance) : null;
    
    let bestDbDate = dbLatestLogDate || dbMetadataDate;
    if (dbLatestLogDate && dbMetadataDate && dbLatestLogDate > dbMetadataDate) {
      bestDbDate = dbLatestLogDate;
    } else if (dbMetadataDate && dbLatestLogDate && dbMetadataDate > dbLatestLogDate) {
      bestDbDate = dbMetadataDate;
    }

    if (excelRecord) {
      processedExcelNames.add(matchedExcelName);
      results.push({
        'Boei App Naam': buoyName,
        'Boei Excel Naam': matchedExcelName,
        'Datum in App': bestDbDate ? bestDbDate.toISOString().split('T')[0] : '',
        'Datum in Excel': excelRecord.lastMaintenanceDate ? excelRecord.lastMaintenanceDate.toISOString().split('T')[0] : '',
        'Dagen Tegoed (Excel)': excelRecord.daysRemaining,
        'Status': (excelRecord.lastMaintenanceDate && bestDbDate && excelRecord.lastMaintenanceDate.toISOString().split('T')[0] === bestDbDate.toISOString().split('T')[0]) ? 'Match' : 'Verschil'
      });
    } else {
      results.push({
        'Boei App Naam': buoyName,
        'Boei Excel Naam': 'Niet Gevonden',
        'Datum in App': bestDbDate ? bestDbDate.toISOString().split('T')[0] : '',
        'Datum in Excel': '',
        'Dagen Tegoed (Excel)': '',
        'Status': 'Enkel in App'
      });
    }
  }

  // Add remaining excel rows that were not mapped
  for (const [key, value] of excelDataMap.entries()) {
    if (!processedExcelNames.has(key)) {
      results.push({
        'Boei App Naam': 'Niet Gevonden',
        'Boei Excel Naam': key,
        'Datum in App': '',
        'Datum in Excel': value.lastMaintenanceDate ? value.lastMaintenanceDate.toISOString().split('T')[0] : '',
        'Dagen Tegoed (Excel)': value.daysRemaining,
        'Status': 'Enkel in Excel'
      });
    }
  }

  // Sort alphabetically by App Name (or Excel name if App name missing)
  results.sort((a, b) => {
    const nameA = a['Boei App Naam'] !== 'Niet Gevonden' ? a['Boei App Naam'] : a['Boei Excel Naam'];
    const nameB = b['Boei App Naam'] !== 'Niet Gevonden' ? b['Boei App Naam'] : b['Boei Excel Naam'];
    return nameA.localeCompare(nameB);
  });

  const ws = xlsx.utils.json_to_sheet(results);
  
  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 25 }, // Boei App Naam
    { wch: 25 }, // Boei Excel Naam
    { wch: 15 }, // Datum in App
    { wch: 15 }, // Datum in Excel
    { wch: 20 }, // Dagen Tegoed (Excel)
    { wch: 15 }  // Status
  ];

  const newWb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(newWb, ws, 'Vergelijking');
  
  const outputFileName = 'Onderhoud_Vergelijking.xlsx';
  xlsx.writeFile(newWb, outputFileName);
  console.log(`Excel file created: ${outputFileName}`);
}

run();
