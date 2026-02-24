import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('URL and Key are required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixCategories() {
    console.log('Updating JFC items with category "Custom" to "Boei"...');
    const { error } = await supabase
        .from('items')
        .update({ category: 'Boei' })
        .ilike('name', '%JFC%')
        .eq('category', 'Custom');

    if (error) {
        console.error('Error updating items:', error);
    } else {
        console.log('Successfully updated items.');
    }
}

fixCategories();
