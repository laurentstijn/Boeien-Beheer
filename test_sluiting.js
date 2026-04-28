const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function test() {
    console.log("Connecting to:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    const { data: items, error: err1 } = await supabaseAdmin.from('items').select('*').eq('category', 'Sluiting');
    if (err1) console.error("Items Error:", err1);
    console.log('Items Sluiting:', items ? items.length : 0);
    
    if (items && items.length > 0) {
        const { data: assets, error: err2 } = await supabaseAdmin.from('assets').select('*').in('item_id', items.map(i=>i.id));
        if (err2) console.error("Assets Error:", err2);
        console.log('Assets Sluiting:', assets ? assets.length : 0);
        console.log('In Stock Assets:', assets ? assets.filter(a => a.status === 'in_stock').length : 0);
    }
}
test();
