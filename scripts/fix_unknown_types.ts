import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifnjgmvcatrbiuhwsgkh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbmpnbXZjYXRyYml1aHdzZ2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDE0NTUsImV4cCI6MjA4NjMxNzQ1NX0.EyR29NIXvJTZk0VEACuu1lVz1gdkx-9AA6ZGF7w_4Ic';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUnknownLabels() {
    console.log('Fetching deployed buoys...');
    const { data: buoys, error } = await supabase
        .from('deployed_buoys')
        .select('*');

    if (error) {
        console.error('Error fetching buoys:', error);
        return;
    }

    console.log(`Found ${buoys.length} deployed buoys.`);

    let updatedCount = 0;

    for (const buoy of buoys) {
        const metadata = buoy.metadata || {};
        let changed = false;

        const components = ['light', 'chain', 'sinker', 'topmark'];

        for (const key of components) {
            const comp = metadata[key];
            if (comp && comp.asset_id && (comp.type === 'Onbekend' || !comp.type)) {
                console.log(`Fixing ${key} for buoy ${buoy.name} (${buoy.id})...`);

                // Fetch the actual asset and its item name
                const { data: asset } = await supabase
                    .from('assets')
                    .select('items!item_id(name)')
                    .eq('id', comp.asset_id)
                    .single();

                if (asset) {
                    const itemName = Array.isArray((asset as any).items) ? (asset as any).items[0]?.name : (asset as any).items?.name;
                    if (itemName) {
                        console.log(`  Found name: ${itemName}`);
                        comp.type = itemName;
                        changed = true;
                    }
                }
            }
        }

        if (changed) {
            console.log(`Updating buoy ${buoy.name}...`);
            const { error: updateError } = await supabase
                .from('deployed_buoys')
                .update({ metadata })
                .eq('id', buoy.id);

            if (updateError) {
                console.error(`  Error updating buoy ${buoy.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Done! Updated ${updatedCount} buoys.`);
}

fixUnknownLabels().catch(console.error);
