
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function standardizeStones() {
    console.log('--- Starting Stone Standardization ---');

    const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*, item:items(*)')
        .or('category.eq.Steen, item.category.eq.Steen');

    if (assetsError) {
        console.error('Error fetching assets:', assetsError);
        return;
    }

    let updates = 0;

    for (const asset of assets) {
        let weight = asset.metadata?.weight || asset.item?.specs?.weight;
        let shape = asset.metadata?.shape || asset.item?.specs?.shape;

        // Parsing logic if missing in metadata but present in Item Name
        if (!weight || !shape) {
            const name = asset.item?.name || '';
            const match = name.match(/(\d+(?:\.\d+)?)T?\s+(\w+)/i);
            if (match) {
                weight = match[1]; // e.g. "4" or "0.2"
                shape = match[2];
            }
        }

        if (weight && !weight.toLowerCase().includes('t') && !weight.toLowerCase().includes('kg')) {
            // It's a raw number like "4" or "1.5"
            const newWeight = `${weight}T`;
            console.log(`Updating ${asset.id} (${weight} ${shape}) -> ${newWeight} ${shape}`);

            const { error } = await supabase
                .from('assets')
                .update({
                    metadata: {
                        ...asset.metadata,
                        weight: newWeight,
                        shape: shape || asset.metadata?.shape // Ensure shape is preserved or set
                    }
                })
                .eq('id', asset.id);

            if (error) console.error('Error updating asset:', error);
            else updates++;
        }

        // Also fix "0.2" -> "0.2T" specific case if needed
    }

    console.log(`--- Finished. Updated ${updates} assets. ---`);
}

standardizeStones();
