import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: allBuoys } = await supabase.from('deployed_buoys').select('*');
    
    // Check all Hoog Water buoys
    const hwBuoys = allBuoys!.filter(b => b.tideRestriction === 'Hoog water');
    console.log(`Total Hoog water buoys: ${hwBuoys.length}`);
    for (const b of hwBuoys) {
        console.log(`- ${b.name} (Due: ${b.nextServiceDue})`);
    }
}
run();
