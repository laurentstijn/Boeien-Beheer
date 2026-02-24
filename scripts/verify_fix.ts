import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verifyFix() {
    const { data: buoys } = await supabase.from('assets').select('*, items!inner(name, category)').eq('items.category', 'Boei').eq('status', 'in_stock');
    const bCounts: Record<string, number> = {};
    buoys?.forEach(b => {
        const color = b.metadata?.color || 'Onbekend';
        bCounts[color] = (bCounts[color] || 0) + 1;
    });
    console.log('Fixed Buoy Counts:', bCounts);

    const { data: lamps } = await supabase.from('assets').select('*, items!inner(name, category)').eq('items.category', 'Lamp').eq('status', 'in_stock');
    const lCounts: Record<string, number> = {};
    lamps?.forEach(l => {
        const color = l.metadata?.color || l.metadata?.lamp_color || 'Onbekend';
        lCounts[color] = (lCounts[color] || 0) + 1;
    });
    console.log('Fixed Lamp Counts:', lCounts);
}

verifyFix();
