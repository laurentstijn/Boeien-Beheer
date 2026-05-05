const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const file = 'Onderhoud_Vergelijking.xlsx';
  const workbook = xlsx.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  // 1. Fetch buoys to get IDs
  const { data: dbBuoys, error } = await supabase
    .from('deployed_buoys')
    .select('id, name, metadata');

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  const nameToBuoy = new Map(dbBuoys.map(b => [b.name, b]));
  let updatedCount = 0;

  for (const row of data) {
    if (row['Status'] === 'Verschil') {
      const buoyName = row['Boei App Naam'];
      const buoy = nameToBuoy.get(buoyName);
      if (!buoy) {
        console.error(`Buoy not found in DB: ${buoyName}`);
        continue;
      }

      // 'Datum in Excel' is the NEXT due date
      const nextDueStr = row['Datum in Excel'];
      if (!nextDueStr) continue;

      const nextDue = new Date(nextDueStr);
      // Calculate last service by subtracting 45 weeks
      const lastService = new Date(nextDue);
      lastService.setDate(lastService.getDate() - (45 * 7));
      
      const lastServiceStr = lastService.toISOString().split('T')[0];
      const nextDueDbStr = nextDue.toISOString().split('T')[0];

      // Insert log
      await supabase.from('maintenance_logs').insert({
        deployed_buoy_id: buoy.id,
        service_date: lastServiceStr,
        description: 'Geïmporteerd uit Excel',
        metadata: { status: 'OK' }
      });

      // Update buoy
      const newMetadata = { ...buoy.metadata, maintenance_interval_weeks: 45 };
      await supabase.from('deployed_buoys').update({
        last_service_date: lastServiceStr,
        next_service_due: nextDueDbStr,
        status: 'OK',
        metadata: newMetadata
      }).eq('id', buoy.id);

      updatedCount++;
      console.log(`Updated ${buoyName}: Last=${lastServiceStr}, Next=${nextDueDbStr}`);
    }
  }

  console.log(`\nFinished updating ${updatedCount} buoys.`);
}

run();
