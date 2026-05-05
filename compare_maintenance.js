const fs = require('fs');
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
  
  for (const buoy of dbBuoys) {
    const buoyName = buoy.name;
    let excelRecord = excelDataMap.get(buoyName);
    
    if (!excelRecord) {
      for (const [key, value] of excelDataMap.entries()) {
        if (buoyName.includes(key) || key.includes(buoyName)) {
           excelRecord = value;
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
      results.push({
        name: buoyName,
        excelDate: excelRecord.lastMaintenanceDate ? excelRecord.lastMaintenanceDate.toISOString().split('T')[0] : 'N/A',
        dbDate: bestDbDate ? bestDbDate.toISOString().split('T')[0] : 'N/A',
        excelDaysRemaining: excelRecord.daysRemaining,
        match: (excelRecord.lastMaintenanceDate && bestDbDate) ? 
          (excelRecord.lastMaintenanceDate.toISOString().split('T')[0] === bestDbDate.toISOString().split('T')[0]) : false
      });
    } else {
      results.push({
        name: buoyName,
        excelDate: 'Niet in Excel',
        dbDate: bestDbDate ? bestDbDate.toISOString().split('T')[0] : 'N/A',
        excelDaysRemaining: 'N/A',
        match: false
      });
    }
  }

  const matching = results.filter(r => r.match);
  const diffs = results.filter(r => r.excelDate !== 'Niet in Excel' && !r.match);
  const missingExcel = results.filter(r => r.excelDate === 'Niet in Excel');

  let md = `# Vergelijking Onderhoudsdata Boeien

Hieronder vind je de vergelijking tussen de database van de boeien app (Supabase) en het Excel bestand \`jobs-boeien.xlsx\` uit de ERP/werkdatabase.

## Samenvatting
- **Totaal aantal boeien in app database:** ${dbBuoys.length}
- **Totaal aantal rijen in Excel:** ${excelDataMap.size}
- **Perfecte match (datums komen overeen):** ${matching.length}
- **Verschillen in datums:** ${diffs.length}
- **Wel in app, niet in Excel:** ${missingExcel.length}

`;

  if (diffs.length > 0) {
    md += `## Verschillen in onderhoudsdatum\n\n`;
    md += `| Boei | Datum in App | Datum in Excel | Dagen Tegoed (Excel) |\n`;
    md += `|---|---|---|---|\n`;
    for (const d of diffs.sort((a,b) => a.name.localeCompare(b.name))) {
       md += `| ${d.name} | ${d.dbDate} | ${d.excelDate} | ${d.excelDaysRemaining} |\n`;
    }
    md += `\n`;
  }

  if (missingExcel.length > 0) {
    md += `## Boeien in App maar NIET in Excel\n\n`;
    md += `Deze boeien staan wel in de applicatie (kaart/lijst) maar werden niet gevonden in \`jobs-boeien.xlsx\`.\n\n`;
    md += `| Boei | Datum in App |\n`;
    md += `|---|---|\n`;
    for (const d of missingExcel.sort((a,b) => a.name.localeCompare(b.name))) {
       md += `| ${d.name} | ${d.dbDate} |\n`;
    }
    md += `\n`;
  }

  // To find buoys in excel but not in DB
  const dbNamesUpper = dbBuoys.map(b => b.name.toUpperCase());
  const missingInDb = [];
  for (const key of excelDataMap.keys()) {
    let found = false;
    for (const dbName of dbNamesUpper) {
      if (dbName.includes(key.toUpperCase()) || key.toUpperCase().includes(dbName)) {
        found = true; break;
      }
    }
    if (!found) {
      missingInDb.push(key);
    }
  }

  if (missingInDb.length > 0) {
    md += `## Boeien in Excel maar NIET in App\n\n`;
    md += `Deze boeien staan in de Excel (\`jobs-boeien.xlsx\`) maar werden niet exact in de app database gevonden.\n\n`;
    for (const name of missingInDb.sort()) {
      md += `- ${name}\n`;
    }
  }

  fs.writeFileSync('maintenance_comparison.md', md);
  console.log("Written maintenance_comparison.md");
}

run();
