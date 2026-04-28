const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanData() {
    try {
        console.log("Fetching deployed assets with malformed locations...");
        const { data: assets, error } = await supabaseAdmin.from('assets').select('id, location, deployment_id').eq('status', 'deployed');
        if (error) throw error;

        let fixed = 0;
        for (const asset of assets) {
            if (!asset.deployment_id) continue;
            
            const isOpZee = asset.location && asset.location.includes('Op zee (');
            const isOpslag = asset.location === 'Opslag' || asset.location === 'Magazijn' || asset.location === 'Magazijn (Onderhoud)';
            
            if (isOpZee || isOpslag || asset.location === null) {
                // Fetch buoy name
                const { data: buoy } = await supabaseAdmin.from('deployed_buoys').select('name').eq('id', asset.deployment_id).single();
                if (buoy) {
                    const newLocation = `Boei ${buoy.name}`;
                    console.log(`Fixing asset ${asset.id}: replacing '${asset.location}' with '${newLocation}'`);
                    await supabaseAdmin.from('assets').update({ location: newLocation }).eq('id', asset.id);
                    fixed++;
                }
            }
        }
        console.log(`Fixed ${fixed} asset locations.`);
    } catch (e) {
        console.error("Script error:", e);
    }
}

cleanData();
