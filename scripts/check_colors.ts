import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceRoleKey!);

async function checkColors() {
    console.log('--- Colors in Items Table ---');
    const { data: items } = await supabase.from('items').select('name');
    const itemColors = new Set();
    const colorRegex = /(Blauw\/Geel|Geel\/Zwart|Zwart\/Geel|Noord|Zuid|Oost|West|Groen|Zwart|Rood|Geel|Blauw|Wit)/i;

    items?.forEach(i => {
        const match = i.name.match(colorRegex);
        if (match) itemColors.add(match[0]);
    });
    console.log('Colors found in items:', Array.from(itemColors));

    console.log('\n--- Colors in Deployed Buoys Metadata ---');
    const { data: buoys } = await supabase.from('deployed_buoys').select('metadata');
    const metadataColors = new Set();
    buoys?.forEach(b => {
        if (b.metadata?.color) metadataColors.add(b.metadata.color);
    });
    console.log('Colors found in metadata:', Array.from(metadataColors));
}

checkColors();
