import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function findColors() {
    const { data: assets } = await supabase
        .from('assets')
        .select('*, items!inner(name, category)')
        .ilike('items.name', '%83935%');

    console.log('--- 83935 ASSETS ---');
    assets?.forEach(a => {
        console.log(`ID: ${a.id}, Status: ${a.status}, Metadata:`, a.metadata);
    });

    const { data: allReva } = await supabase
        .from('assets')
        .select('*, items!inner(name, category)')
        .ilike('items.name', '%reva%');

    console.log('\n--- ALL REVA ASSETS ---');
    allReva?.forEach(a => {
        if (a.metadata?.color) {
            console.log(`${a.items.name} has color ${a.metadata.color}`);
        }
    });
}

findColors();
