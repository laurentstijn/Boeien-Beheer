import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fixStock() {
    // 1. Fix the "Blauw/Geel" Boei
    const { data: bAssets } = await supabase
        .from('assets')
        .select('*, items!inner(name, category)')
        .eq('status', 'in_stock')
        .eq('items.category', 'Boei')
        .ilike('items.name', '%Blauw/Geel%');

    const bToFix = bAssets?.filter(a => !a.metadata?.color);
    if (bToFix && bToFix.length > 0) {
        console.log(`Fixing ${bToFix.length} Blauw/Geel buoys...`);
        for (const a of bToFix) {
            const newMetadata = { ...a.metadata, color: 'Blauw/Geel' };
            await supabase.from('assets').update({ metadata: newMetadata }).eq('id', a.id);
            console.log(`Updated Boei ${a.id} to Blauw/Geel`);
        }
    }

    // 2. Fix the unknown Lamp
    const { data: lAssets } = await supabase
        .from('assets')
        .select('*, items!inner(name, category)')
        .eq('status', 'in_stock')
        .eq('items.category', 'Lamp')
        .eq('metadata->>serialNumber', '1560173213');

    if (lAssets && lAssets.length > 0) {
        console.log(`Fixing lamp ${lAssets[0].id}...`);
        const a = lAssets[0];
        const newMetadata = { ...a.metadata, color: 'Geel' };
        await supabase.from('assets').update({ metadata: newMetadata }).eq('id', a.id);
        console.log(`Updated Lamp ${a.id} to Geel`);
    } else {
        // Alternative search for the lamp found in script before
        const { data: lAssets2 } = await supabase
            .from('assets')
            .select('*, items!inner(name, category)')
            .eq('id', '270e2ef8-daa6-4ea7-97bb-d7d7ab5ab8f4');

        if (lAssets2 && lAssets2.length > 0) {
            console.log(`Fixing lamp by ID ${lAssets2[0].id}...`);
            const a = lAssets2[0];
            const newMetadata = { ...a.metadata, color: 'Geel' };
            await supabase.from('assets').update({ metadata: newMetadata }).eq('id', a.id);
            console.log(`Updated Lamp ${a.id} to Geel`);
        }
    }
}

fixStock();
