import { supabaseAdmin } from './src/lib/supabaseAdmin';

async function checkSchema() {
    const { data, error } = await supabaseAdmin.from('assets').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Assets sample:', data[0]);
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}

checkSchema();
