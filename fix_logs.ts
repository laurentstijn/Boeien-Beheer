import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: logs } = await supabase.from('maintenance_logs').select('*').order('created_at', { ascending: false }).limit(20);
    
    let updated = 0;
    for (const log of logs || []) {
        const meta = log.metadata || {};
        if (meta.replacement_names && Object.keys(meta.replacement_names).length === 0) {
            let names: Record<string, string> = {};
            const keys = ['buoy', 'light', 'chain', 'sinker', 'shackle', 'zinc'];
            let changed = false;
            
            for (const k of keys) {
                if (meta[k]) {
                    // Try to fetch the name of this asset
                    const { data: assetItem } = await supabase.from('assets').select('items(name)').eq('id', meta[k]).single();
                    if (assetItem && assetItem.items) {
                        names[k] = (assetItem.items as any).name;
                        changed = true;
                    }
                }
            }
            
            if (changed) {
                meta.replacement_names = names;
                await supabase.from('maintenance_logs').update({ metadata: meta }).eq('id', log.id);
                console.log(`Updated log ${log.id} with names:`, names);
                updated++;
            }
        }
    }
    console.log(`Updated ${updated} logs.`);
}
run().catch(console.error);
