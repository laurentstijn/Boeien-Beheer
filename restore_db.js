const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const backupData = JSON.parse(fs.readFileSync('backup_maintenance_before_sync.json', 'utf8'));
  const { buoys, logs } = backupData;
  
  console.log("Restoring buoys...");
  for (const buoy of buoys) {
    const { error } = await supabase.from('deployed_buoys').update({
      last_service_date: buoy.last_service_date,
      next_service_due: buoy.next_service_due,
      status: buoy.status,
      metadata: buoy.metadata
    }).eq('id', buoy.id);
    if (error) console.error("Error restoring buoy:", buoy.id, error.message);
  }

  console.log("Restoring logs (deleting new ones)...");
  // The backup contains all old logs. We should delete logs that are not in the backup.
  const oldLogIds = new Set(logs.map(l => l.id));
  
  const { data: currentLogs } = await supabase.from('maintenance_logs').select('id');
  const logsToDelete = currentLogs.filter(l => !oldLogIds.has(l.id)).map(l => l.id);
  
  if (logsToDelete.length > 0) {
    console.log(`Deleting ${logsToDelete.length} new logs...`);
    const { error } = await supabase.from('maintenance_logs').delete().in('id', logsToDelete);
    if (error) console.error("Error deleting logs:", error.message);
  }
  
  // Also we should restore logs if any were deleted, but we didn't delete any.
  
  console.log("Restore complete!");
}
run();
