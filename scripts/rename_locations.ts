import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifnjgmvcatrbiuhwsgkh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbmpnbXZjYXRyYml1aHdzZ2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDE0NTUsImV4cCI6MjA4NjMxNzQ1NX0.EyR29NIXvJTZk0VEACuu1lVz1gdkx-9AA6ZGF7w_4Ic';

const supabase = createClient(supabaseUrl, supabaseKey);

async function renameLocations() {
    console.log('Fetching deployed assets...');
    const { data: assets, error } = await supabase
        .from('assets')
        .select('id, location')
        .eq('status', 'deployed');

    if (error) {
        console.error('Error fetching assets:', error);
        return;
    }

    console.log(`Found ${assets.length} deployed assets.`);

    let updatedCount = 0;

    for (const asset of assets) {
        if (!asset.location) continue;

        let newLocation = asset.location;
        let changed = false;

        if (asset.location.startsWith('Deployed at ')) {
            newLocation = asset.location.replace('Deployed at ', 'Boei ');
            changed = true;
        } else if (asset.location.startsWith('In gebruik op ')) {
            newLocation = asset.location.replace('In gebruik op ', 'Boei ');
            changed = true;
        }

        if (changed) {
            console.log(`Updating asset ${asset.id}: "${asset.location}" -> "${newLocation}"`);
            const { error: updateError } = await supabase
                .from('assets')
                .update({ location: newLocation })
                .eq('id', asset.id);

            if (updateError) {
                console.error(`Error updating asset ${asset.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Done! Updated ${updatedCount} assets.`);
}

renameLocations().catch(console.error);
