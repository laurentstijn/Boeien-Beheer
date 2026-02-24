import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkStock() {
    const { data: allInStock } = await supabase
        .from('assets')
        .select('*, items!inner(name, category)')
        .eq('status', 'in_stock')
        .in('items.category', ['Lamp', 'Boei']);

    console.log('--- ALL LAMPS IN STOCK ---');
    allInStock?.filter(a => a.items.category === 'Lamp').forEach(a => {
        console.log(`ID: ${a.id}, Name: ${a.items.name}, Metadata Color: ${a.metadata?.color || a.metadata?.lamp_color || 'MISSING'}`);
    });

    console.log('\n--- ALL BUOYS IN STOCK ---');
    allInStock?.filter(a => a.items.category === 'Boei').forEach(a => {
        console.log(`ID: ${a.id}, Name: ${a.items.name}, Metadata Color: ${a.metadata?.color || 'MISSING'}`);
    });
}

checkStock();
