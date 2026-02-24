import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTable() {
    console.log('Checking app_settings table...');
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) {
        console.error('ERROR:', error.message);
    } else {
        console.log('TABLE_EXISTS. Data:', data);
    }
}

checkTable();
