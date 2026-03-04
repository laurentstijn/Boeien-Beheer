import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
    const category = 'Ketting';
    const { data: assets, error } = await supabaseAdmin
        .from('assets')
        .select(`
            id,
            status,
            location,
            metadata,
            items (
                id,
                name,
                category
            )
        `)
        .eq('status', 'in_stock')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching assets:', error);
        return;
    }

    const inCategory = (assets || []).filter((a: any) => a.items?.category === category);
    console.log(`Found ${inCategory.length} items for ${category}`);
    if (inCategory.length > 0) {
      console.log(inCategory[0]);
    }
}
run().catch(console.error);
