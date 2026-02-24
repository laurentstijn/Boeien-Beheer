import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkItems() {
    const { data: items } = await supabase.from('items').select('name, category');
    console.log('--- ALL ITEM NAMES BY CATEGORY ---');
    const grouped: any = {};
    items?.forEach(i => {
        if (!grouped[i.category]) grouped[i.category] = [];
        grouped[i.category].push(i.name);
    });

    Object.keys(grouped).sort().forEach(cat => {
        console.log(`\nCATEGORY: ${cat}`);
        grouped[cat].sort().forEach((name: string) => console.log(`  - ${name}`));
    });
}

checkItems();
