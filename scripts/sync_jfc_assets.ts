import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('URL and Key are required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAssets() {
    console.log('Checking items and their assets...');
    const { data: items } = await supabase
        .from('items')
        .select('id, name, stock_quantity')
        .ilike('name', '%JFC%');

    for (const item of (items || [])) {
        const { count } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('item_id', item.id);

        console.log(`Item: ${item.name} (Stock in items table: ${item.stock_quantity}) - Assets in assets table: ${count}`);

        if (item.stock_quantity > (count || 0)) {
            const diff = item.stock_quantity - (count || 0);
            console.log(`Missing ${diff} assets for ${item.name}. Creating them...`);
            for (let i = 0; i < diff; i++) {
                await supabase.from('assets').insert({
                    item_id: item.id,
                    status: 'in_stock',
                    location: 'Magazijn'
                });
            }
        }
    }
}

checkAssets();
