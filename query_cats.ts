import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: items } = await supabase.from('items').select('category').limit(50);
    const unique = new Set((items || []).map(i => i.category));
    console.log(Array.from(unique));
}
run().catch(console.error);
