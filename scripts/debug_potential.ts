import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkStock() {
    const names = [
        'Mobilis BC1241/BC1242',
        'Mobilis BC1241/BC1242 Geel Reserve',
        'JET 9000',
        'JET 9000 Rood Reserve',
        'JET 2000',
        'JET 2000 Rood Reserve',
        'JET 2000 Groen Reserve'
    ];
    const { data } = await supabase
        .from('assets')
        .select('*, items!inner(name)')
        .in('items.name', names)
        .eq('status', 'in_stock');

    const counts: Record<string, number> = {};
    data?.forEach(d => {
        const name = (d.items as any).name;
        counts[name] = (counts[name] || 0) + 1;
    });

    console.log('--- RAW COMPONENT COUNTS ---');
    names.forEach(n => console.log(`${n}: ${counts[n] || 0}`));
}

checkStock();
