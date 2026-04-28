const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixZones() {
    console.log("Fixing all assets and deployed buoys with NULL zones...");
    const { data, error } = await supabaseAdmin.from('assets').update({ zone: 'zone_zeeschelde' }).is('zone', null);
    if (error) console.error("Error updating assets:", error);
    else console.log("Assets updated.");

    const { error: error2 } = await supabaseAdmin.from('deployed_buoys').update({ zone: 'zone_zeeschelde' }).is('zone', null);
    if (error2) console.error("Error updating buoys:", error2);
    else console.log("Buoys updated.");
}

fixZones();
