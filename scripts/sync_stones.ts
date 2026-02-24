
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config(); // Fallback to .env
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target counts
const TARGET_COUNTS: Record<string, number> = {
    "4T Ovaal": 3,
    "3T Ovaal": 9,
    "1.5T Rond": 5,
    "1T Rond": 0,
    "1.5T Plat": 3,
    "0.2T Vierkant": 2
};

async function syncStones() {
    console.log('--- Starting Stone Stock Sync ---');

    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .or('category.eq.Steen,category.eq.Custom');

    if (itemsError) {
        console.error('Error fetching items:', itemsError);
        return;
    }

    const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*, item:items(*)') // join with items to get specs
        .or('category.eq.Steen, item.category.eq.Steen');

    if (assetsError) {
        console.error('Error fetching assets:', assetsError);
        return;
    }

    const currentGroups: Record<string, any[]> = {};

    const getKey = (asset: any) => {
        let w = asset.metadata?.weight || asset.item?.specs?.weight;
        let s = asset.metadata?.shape || asset.item?.specs?.shape;

        if (!w || !s) {
            const name = asset.item?.name || '';
            const match = name.match(/(\d+(?:\.\d+)?)T?\s+(\w+)/i);
            if (match) {
                w = match[1] + 'T';
                s = match[2];
            }
        }

        if (w && s) return `${w} ${s}`;
        return 'Unknown';
    };

    assets.forEach(asset => {
        const key = getKey(asset);
        if (!currentGroups[key]) currentGroups[key] = [];
        currentGroups[key].push(asset);
    });

    console.log('Current Groups (Raw):', Object.keys(currentGroups).map(k => `${k}: ${currentGroups[k].length}`));

    for (const [targetName, targetCount] of Object.entries(TARGET_COUNTS)) {
        let matchedKey = Object.keys(currentGroups).find(k => {
            if (k === targetName) return true;
            return k.toLowerCase() === targetName.toLowerCase();
        });

        const [targetWeight, ...targetShapeParts] = targetName.split(' ');
        const targetShape = targetShapeParts.join(' ');

        const currentAssets = matchedKey ? currentGroups[matchedKey] : [];
        const currentCount = currentAssets.length;
        const diff = targetCount - currentCount;

        console.log(`Checking ${targetName}: Current=${currentCount}, Target=${targetCount}, Diff=${diff}`);

        if (diff > 0) {
            console.log(`  -> Adding ${diff} assets for ${targetName}`);

            let itemId = items.find(i =>
                (i.specs?.weight === targetWeight && i.specs?.shape === targetShape) ||
                i.name.includes(targetName)
            )?.id;

            if (!itemId) {
                itemId = items.find(i => i.name.includes(`Betonblok ${targetName}`))?.id;
            }

            if (!itemId) {
                console.error(`  !! CRITICAL: Could not find item type for ${targetName}. Skipping creation.`);
                continue;
            }

            for (let i = 0; i < diff; i++) {
                const { error } = await supabase.from('assets').insert({
                    item_id: itemId,
                    status: 'in_stock',
                    location: 'Magazijn',
                    metadata: {
                        notes: 'Auto-created by sync script',
                        weight: targetWeight,
                        shape: targetShape,
                        article_number: `SYNC-${Date.now()}-${i}`
                    }
                });
                if (error) console.error('Error creating asset:', error);
            }

        } else if (diff < 0) {
            const removeCount = Math.abs(diff);
            console.log(`  -> Removing ${removeCount} assets for ${targetName}`);

            const removable = currentAssets
                .filter(a => a.status === 'in_stock')
                .slice(0, removeCount);

            if (removable.length < removeCount) {
                console.warn(`  !! Warning: Requested to remove ${removeCount}, but only ${removable.length} are in_stock.`);
            }

            for (const asset of removable) {
                const { error } = await supabase.from('assets').delete().eq('id', asset.id);
                if (error) console.error('Error deleting asset:', error);
            }
        }
    }
    console.log('--- Sync Complete ---');
}

syncStones();
