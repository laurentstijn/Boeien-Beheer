const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: buoys } = await supabase.from('deployed_buoys').select('*');
  const { data: logs } = await supabase.from('maintenance_logs').select('*');
  
  const backup = { buoys, logs };
  fs.writeFileSync('backup_maintenance_before_sync.json', JSON.stringify(backup, null, 2));
  console.log('Backup written to backup_maintenance_before_sync.json');
}
run();
