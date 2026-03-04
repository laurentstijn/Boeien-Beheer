import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: buoys, error } = await supabase.from('deployed_buoys').select('id, name, metadata').in('name', ['DGD 3', 'DGD 2']);
  if (error) {
    console.error("Error fetching DGD buoys", error);
    return;
  }

  console.log("Found buoys:", JSON.stringify(buoys, null, 2));

  for (const buoy of buoys) {
    const meta = buoy.metadata || {};
    const components = ['buoy', 'light', 'chain', 'sinker', 'shackle', 'zinc'];
    for (const comp of components) {
      const assetId = meta[comp]?.asset_id;
      if (assetId) {
        console.log(`Buoy ${buoy.name} has ${comp} asset ${assetId}`);
        const { data: asset } = await supabase.from('assets').select('id, status, location, items(name)').eq('id', assetId).single();
        console.log(`  -> Current DB Status: ${asset?.status}, Location: ${asset?.location}, Name: ${(asset?.items as any)?.name}`);

        if (asset?.status === 'in_stock') {
          await supabase.from('assets').update({
            status: 'deployed',
            location: `Op zee (${buoy.name})`,
            deployment_id: buoy.id
          }).eq('id', assetId);
          console.log(`  -> FIXED: Set to deployed on ${buoy.name}`);
        }
      } else {
        console.log(`Buoy ${buoy.name} has NO asset assigned for ${comp}`);
      }
    }
  }

  // Find the recent logs for these buoys to see what was replaced, and maybe set old ones to maintenance
  const buoyIds = buoys.map(b => b.id);
  const { data: logs } = await supabase.from('maintenance_logs')
    .select('*')
    .in('deployed_buoy_id', buoyIds)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log("\n--- RECENT LOGS ---");
  for (const log of logs || []) {
    console.log(`Log ${log.id} from ${log.created_at} for ${log.deployed_buoy_id}`);
    const repl = log.replacements || {};
    const components = ['buoy', 'light', 'chain', 'sinker', 'shackle', 'zinc'];
    for (const comp of components) {
      if (repl[comp]) {
        console.log(`  Replaced ${comp}: NEW=${repl[comp]} OLD=${repl[`${comp}_lost`]}`);
        if (repl[`${comp}_lost`]) {
          const { data: oldAsset } = await supabase.from('assets').select('id, status').eq('id', repl[`${comp}_lost`]).single();
          console.log(`    Old asset status: ${oldAsset?.status}`);
          if (oldAsset?.status === 'deployed') {
            console.log(`    Fixing old asset to maintenance...`);
            await supabase.from('assets').update({
              status: 'maintenance',
              location: 'Magazijn (Onderhoud)',
              deployment_id: null
            }).eq('id', repl[`${comp}_lost`]);
          }
        }
        // Also ensure the newest replacement is actually deployed
        const { data: newAsset } = await supabase.from('assets').select('id, status').eq('id', repl[comp]).single();
        if (newAsset?.status === 'in_stock') {
          const buoyName = buoys.find(b => b.id === log.deployed_buoy_id)?.name;
          console.log(`    Fixing NEW replacement asset to deployed...`);
          await supabase.from('assets').update({
            status: 'deployed',
            location: `Op zee (${buoyName})`,
            deployment_id: log.deployed_buoy_id
          }).eq('id', repl[comp]);
        }
      }
    }
  }
}

run().catch(console.error);
