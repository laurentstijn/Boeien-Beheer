import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkStats() {
    const { data: stats } = await supabase.from('assets').select('status, items!inner(category)');
    const counts: Record<string, number> = {};
    stats?.forEach(s => {
        const cat = (s.items as any).category;
        const key = `${cat} | ${s.status}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    console.log('--- ASSET STATUS STATS ---');
    Object.entries(counts).sort().forEach(([k, v]) => console.log(`${k}: ${v}`));
}

checkStats();
