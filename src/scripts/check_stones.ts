
import { supabase } from '@/lib/supabase';

async function checkStones() {
    console.log('Checking Items with category containing "Steen"...');
    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .ilike('category', '%Steen%');

    if (itemsError) {
        console.error('Error fetching items:', itemsError);
    } else {
        console.log('Items found:', items);
    }

    console.log('\nChecking Assets for these items...');
    if (items && items.length > 0) {
        const itemIds = items.map(i => i.id);
        const { data: assets, error: assetsError } = await supabase
            .from('assets')
            .select('*')
            .in('item_id', itemIds);

        if (assetsError) {
            console.error('Error fetching assets:', assetsError);
        } else {
            console.log(`Assets found: ${assets.length}`);
            console.log('Sample asset:', assets[0]);
        }
    } else {
        console.log('No item IDs to check assets for.');
    }
}

checkStones();
