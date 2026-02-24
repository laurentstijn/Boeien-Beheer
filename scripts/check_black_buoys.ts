import { supabase } from '../src/lib/supabase';

async function main() {
    console.log("Checking for black items ('Zwart') in items...");
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .ilike('name', '%Zwart%');

    if (error) {
        console.error('Error fetching black items:', error);
        return;
    }

    console.log(`Found ${data.length} items containing 'Zwart' in their name.`);
    if (data.length > 0) {
        data.forEach(item => {
            console.log(`- [${item.category}] ${item.name} (ID: ${item.id})`);
        });
    } else {
        console.log("No black items found in the database. You might want to seed some.");
    }
}

main();
