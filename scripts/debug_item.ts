import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkItem() {
    const { data: item } = await supabase.from('items').select('*').eq('name', '83935reva').single();
    console.log('Item 83935reva:', JSON.stringify(item, null, 2));

    const { data: others } = await supabase.from('items').select('name, specs').ilike('name', '%reva%');
    console.log('Other reva items:', JSON.stringify(others, null, 2));
}

checkItem();
