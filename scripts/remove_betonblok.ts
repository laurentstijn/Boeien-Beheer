import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifnjgmvcatrbiuhwsgkh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbmpnbXZjYXRyYml1aHdzZ2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDE0NTUsImV4cCI6MjA4NjMxNzQ1NX0.EyR29NIXvJTZk0VEACuu1lVz1gdkx-9AA6ZGF7w_4Ic';

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeBetonblok() {
    console.log('Fetching items with code category Steen...');
    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, name')
        .eq('category', 'Steen');

    if (itemsError) {
        console.error('Error fetching items:', itemsError);
        return;
    }

    console.log(`Found ${items.length} stone items.`);

    let updatedItemsCount = 0;
    for (const item of items) {
        if (item.name.includes('Betonblok')) {
            const newName = item.name.replace('Betonblok ', '').trim();
            console.log(`Updating item ${item.name} -> ${newName}`);
            const { error: updateError } = await supabase
                .from('items')
                .update({ name: newName })
                .eq('id', item.id);

            if (updateError) {
                console.error(`  Error updating item ${item.id}:`, updateError);
            } else {
                updatedItemsCount++;
            }
        }
    }
    console.log(`Updated ${updatedItemsCount} items.`);

    console.log('Fetching deployed buoys...');
    const { data: buoys, error: buoysError } = await supabase
        .from('deployed_buoys')
        .select('id, name, metadata');

    if (buoysError) {
        console.error('Error fetching buoys:', buoysError);
        return;
    }

    let updatedBuoysCount = 0;
    for (const buoy of buoys) {
        if (buoy.metadata?.sinker?.type?.includes('Betonblok')) {
            console.log(`Updating metadata for buoy ${buoy.name}...`);
            const newMetadata = { ...buoy.metadata };
            newMetadata.sinker.type = newMetadata.sinker.type.replace('Betonblok ', '').trim();

            const { error: updateError } = await supabase
                .from('deployed_buoys')
                .update({ metadata: newMetadata })
                .eq('id', buoy.id);

            if (updateError) {
                console.error(`  Error updating buoy ${buoy.id}:`, updateError);
            } else {
                updatedBuoysCount++;
            }
        }
    }
    console.log(`Updated metadata for ${updatedBuoysCount} buoys.`);
}

removeBetonblok().catch(console.error);
