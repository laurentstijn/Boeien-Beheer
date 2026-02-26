import { supabaseAdmin } from './src/lib/supabaseAdmin';

async function checkSchema() {
    const { data, error } = await supabaseAdmin.from('items').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Items sample:', data[0]);
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}

checkSchema();
