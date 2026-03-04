import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: logs } = await supabase.from('maintenance_logs').select('*, deployed_buoys(name)').order('created_at', { ascending: false }).limit(5);
    for (const log of logs || []) {
        console.log(`Log ${log.id} on ${(log as any).deployed_buoys?.name}:`);
        console.log(JSON.stringify(log.metadata, null, 2));
    }
}
run().catch(console.error);
