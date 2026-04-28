const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function test() {
    const { data: itemData } = await supabaseAdmin.from('items').select('id, name, category, specs').eq('category', 'Sluiting');
    console.log("Items:", itemData.length);
    const itemIds = itemData.map(i => i.id);
    const { data: assets, error } = await supabaseAdmin.from('assets').select('*').in('item_id', itemIds).eq('zone', 'all');
    console.log("Assets filtered by zone='all':", assets ? assets.length : 0);
    const { data: assets2 } = await supabaseAdmin.from('assets').select('*').in('item_id', itemIds).eq('zone', 'null');
    console.log("Assets filtered by zone='null':", assets2 ? assets2.length : 0);
    const { data: assets3 } = await supabaseAdmin.from('assets').select('*').in('item_id', itemIds).is('zone', null);
    console.log("Assets filtered by zone IS null:", assets3 ? assets3.length : 0);
    const { data: assets4 } = await supabaseAdmin.from('assets').select('zone').in('item_id', itemIds);
    console.log("All zones for these assets:", assets4);
}
test();
