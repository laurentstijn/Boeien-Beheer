import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { inventoryItems } from '@/lib/data';
import { getDeployedBuoys } from '@/lib/sheets';

export async function GET() {
    try {
        let inventorySuccess = 0;
        let inventoryErrors = [] as any[];

        // 0. Cleanup existing data (Optional: use with caution, but good for re-syncing)
        console.log('Cleaning up existing items and assets...');
        await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        await supabase.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        // 1. Seed Inventory Items
        console.log('Seeding items...');
        for (const item of inventoryItems) {
            // Upsert item
            const { data: upsertedItem, error } = await supabase.from('items').upsert({
                name: item.name,
                category: item.category,
                stock_quantity: item.stock,
                min_stock_level: item.minStock,
                specs: { details: item.details },
                metadata: { original_id: item.id }
            }, { onConflict: 'name' }).select().single();

            if (error) {
                console.error(`Error seeding item ${item.name}:`, error);
                inventoryErrors.push({ name: item.name, error });
                continue;
            }
            inventorySuccess++;

            // Seed ASSETS for this item
            if (['Ketting', 'Steen', 'Boei', 'Structuur', 'Toren', 'Topteken', 'Lamp', 'Sluiting', 'Opslag'].includes(item.category)) {
                // Check if assets already exist for this item to avoid duplicates on re-seed
                const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true }).eq('item_id', upsertedItem.id);

                const currentCount = count || 0;
                const targetCount = item.stock;

                if (currentCount < targetCount) {
                    const toAdd = targetCount - currentCount;

                    // Determine metadata based on category and details
                    let swivel = 'Nee';
                    let buoyMetadata: any = {};

                    const details = item.details || '';

                    if (item.category === 'Ketting') {
                        if (details.toLowerCase().includes('met draainagel')) swivel = 'Ja';
                        else if (details.toLowerCase().includes('zonder draainagel')) swivel = 'Nee';
                        else if (item.name.includes('Rood')) swivel = 'Nee';
                        else swivel = 'Ja';
                    }

                    if (item.category === 'Boei') {
                        const parts = details.split('|');
                        if (parts.length >= 3) {
                            buoyMetadata = {
                                model: parts[0],
                                color: parts[1],
                                isComplete: parts[2] === 'Complete',
                                isAssembled: parts[2] === 'Assembled',
                                isReserve: parts[2] === 'Reserve',
                                isDrijflichaam: parts[3] === 'Drijflichaam'
                            };
                        }
                    }

                    let stoneMetadata: any = {};
                    if (item.category === 'Steen') {
                        // Parse weight from name (e.g. "0.2T Vierkant")
                        const weightMatch = item.name.match(/(\d+(\.\d+)?)T/);
                        if (weightMatch) {
                            stoneMetadata.weight = weightMatch[1];
                        }
                        // Parse shape from details (e.g. "Vierkant")
                        stoneMetadata.shape = details;
                    }

                    const newAssets = Array(toAdd).fill(null).map(() => ({
                        item_id: upsertedItem.id,
                        status: 'in_stock',
                        location: 'Magazijn',
                        metadata: {
                            generated: true,
                            original_batch_id: item.id,
                            swivel: swivel,
                            ...buoyMetadata,
                            ...stoneMetadata
                        }
                    }));

                    const { error: assetError } = await supabase.from('assets').insert(newAssets);
                    if (assetError) console.error(`Error creating assets for ${item.name}:`, assetError);
                }
            }
        }

        // 2. Seed Deployed Buoys from Sheets
        console.log('Fetching buoys from sheets...');
        const sheetBuoys = await getDeployedBuoys();
        console.log(`Found ${sheetBuoys.length} buoys to seed.`);

        let buoySuccess = 0;
        let buoyErrors = [] as any[];

        for (const buoy of sheetBuoys) {
            // Create a config placeholder if it doesn't exist? 
            // For simplicity, we just insert the buoy for now, or link to a generic config.
            // Getting or Creating a Buoy Configuration on the fly based on the name

            let configId = null;
            // ... (keep config logic or simplify for debugging)
            if (buoy.buoyType.name) {
                const { data: config } = await supabase
                    .from('buoy_configurations')
                    .select('id')
                    .eq('name', buoy.buoyType.name)
                    .single();

                if (config) {
                    configId = config.id;
                } else {
                    const { data: newConfig } = await supabase
                        .from('buoy_configurations')
                        .insert({ name: buoy.buoyType.name })
                        .select('id')
                        .single();
                    if (newConfig) configId = newConfig.id;
                }
            }

            // Format date correctly (Google Sheets often returns DD-MM-YYYY, Postgres needs YYYY-MM-DD or standard)
            // sheets.ts returns raw string. Let's try to parse it if needed.
            // Assuming sheets.ts returns something valid or we leave it null if invalid.
            let formattedDate = null;
            if (buoy.date) {
                const parts = buoy.date.split('-');
                if (parts.length === 3) {
                    formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
                }
            }

            const { error } = await supabase.from('deployed_buoys').upsert({
                name: buoy.name,
                buoy_config_id: configId,
                location: `(${buoy.location.lat},${buoy.location.lng})`,
                deployment_date: formattedDate || undefined,
                notes: buoy.notes,
                metadata: {
                    original_id: buoy.id,
                    sinker: buoy.sinker,
                    chain: buoy.chain,
                    light: buoy.light,
                    topmark: buoy.topmark
                }
            }, { onConflict: 'name' });

            if (error) {
                console.error(`Error seeding buoy ${buoy.name}:`, error);
                buoyErrors.push({ name: buoy.name, error });
            } else {
                buoySuccess++;
            }
        }

        return NextResponse.json({
            success: true,
            inventory: { output: `${inventorySuccess}/${inventoryItems.length}`, errors: inventoryErrors },
            buoys: { output: `${buoySuccess}/${sheetBuoys.length}`, errors: buoyErrors }
        });
    } catch (error) {
        console.error('Seeding failed:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
