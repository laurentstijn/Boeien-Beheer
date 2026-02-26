import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: buoys, error } = await supabase
        .from('deployed_buoys')
        .select('*')
        .eq('status', 'OK')
        // actually let's just get all buoys
    
    if (error) {
        console.error(error);
        return;
    }
    
    const overdue = buoys.filter(b => b.status !== 'Hidden' && b.status !== 'Maintenance' && b.nextServiceDue && new Date(b.nextServiceDue) < new Date());
    const hoogWater = overdue.filter(b => b.tideRestriction === 'Hoog water');
    console.log(`Found ${hoogWater.length} overdue buoys requiring Hoog water:`);
    hoogWater.forEach(b => console.log(`- ${b.name} (Due: ${b.nextServiceDue})`));
}
run();
