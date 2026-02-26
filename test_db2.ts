import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Get a random buoy
    const { data: buoys } = await supabase.from('deployed_buoys').select('id, name').limit(1);
    if (!buoys || buoys.length === 0) return;
    
    const buoy = buoys[0];
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 2); // In 2 days
    
    // Insert planning entry
    const { error } = await supabase.from('planning_entries').insert({
        buoy_id: buoy.id,
        notes: 'Test planning om de filter te proberen',
        planned_date: testDate.toISOString().split('T')[0]
    });
    
    if (error) console.error("Error inserting:", error);
    else console.log(`✓ Added test planning for buoy: ${buoy.name} on ${testDate.toISOString().split('T')[0]}`);
}
run();
