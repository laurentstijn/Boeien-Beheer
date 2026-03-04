import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: dgdBuoys } = await supabase.from('deployed_buoys').select('id, name, metadata').in('name', ['DGD 3', 'DGD 2']);
    const buoyIds = dgdBuoys?.map(b => b.id) || [];
    
    const { data: logs } = await supabase.from('maintenance_logs').select('*').in('deployed_buoy_id', buoyIds).order('created_at', { ascending: false }).limit(2);
    
    for (const log of logs || []) {
        const meta = log.metadata || {};
        meta.replacement_names = {
            buoy: 'JFC MARINE 1500 Geel',
            chain: 'Ketting Blauw',
            sinker: '3T Ovaal',
            light: 'Carmanah M860 (Geel)'
        };
        await supabase.from('maintenance_logs').update({ metadata: meta }).eq('id', log.id);
        console.log(`Updated manual replacement_names for log ${log.id}`);
    }
}
run().catch(console.error);
