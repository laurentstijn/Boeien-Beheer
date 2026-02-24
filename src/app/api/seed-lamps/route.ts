import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

// Type definition for the JSON data
type LampRecord = {
    serial: string;
    buoy_name: string;
    id2: string;
    model: string;
    manufacturer: string;
};

export async function GET() {
    try {
        const filePath = '/Users/stijnlaurent/.gemini/antigravity/brain/6513d06f-30ab-412e-b7d9-60f81bf45d06/lamps_data.json';
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = JSON.parse(fileContent) as LampRecord[];
        let createdCount = 0;
        let updatedCount = 0;
        const report: string[] = [];

        // 1. Get buoy items (to know item_id for 'Lamp')
        // We need to know which Item ID corresponds to these models. 
        // If they don't exist, we should probably create them or map to a generic 'Lamp' item.
        // For now, let's assume we map to a generic 'Lamp' item or try to find a specific one.
        // Let's check if we have these models in 'items'.

        // Let's create a map of models to item_ids
        const uniqueModels = Array.from(new Set(records.map(r => r.model)));
        const modelItemIdMap: Record<string, string> = {};

        for (const model of uniqueModels) {
            // Check if item exists
            let { data: item } = await supabase
                .from('items')
                .select('id')
                .eq('name', model)
                .single();

            if (!item) {
                // Create item if not exists
                const { data: newItem, error } = await supabase
                    .from('items')
                    .insert({
                        name: model,
                        category: 'Lamp',
                        stock_quantity: 0, // Will be calculated from assets
                        specs: { manufacturer: 'Carmanah' } // Defaulting based on data
                    })
                    .select('id')
                    .single();

                if (newItem) item = newItem;
                console.log(`Created new item key for ${model}`);
            }

            if (item) modelItemIdMap[model] = item.id;
        }

        // 2. Fetch deployed buoys to link
        const { data: buoys } = await supabase.from('deployed_buoys').select('id, name, metadata');
        const buoyMap = new Map(buoys?.map(b => [b.name, b]) || []);

        // 3. Process each record
        for (const record of records) {
            const itemId = modelItemIdMap[record.model];
            if (!itemId) continue;

            // Check if asset exists by serial
            const { data: existingAsset } = await supabase
                .from('assets')
                .select('id')
                .eq('serial_number', record.serial)
                .single();

            const buoy = buoyMap.get(record.buoy_name);
            const status = buoy ? 'deployed' : 'in_stock';
            const location = buoy ? `Op boei ${buoy.name}` : 'Magazijn';
            const deploymentId = buoy ? buoy.id : null;

            if (existingAsset) {
                // Update
                await supabase.from('assets').update({
                    status,
                    location,
                    deployment_id: deploymentId,
                    // metadata?
                }).eq('id', existingAsset.id);
                updatedCount++;
            } else {
                // Create
                await supabase.from('assets').insert({
                    item_id: itemId,
                    serial_number: record.serial,
                    status,
                    location,
                    deployment_id: deploymentId,
                    purchase_date: new Date().toISOString() // Placeholder
                });
                createdCount++;
            }

            // Update Buoy Metadata if linked
            if (buoy) {
                const newMetadata = {
                    ...buoy.metadata,
                    light: {
                        type: record.model,
                        serialNumber: record.serial,
                        manufacturer: record.manufacturer
                    }
                };

                await supabase.from('deployed_buoys').update({
                    metadata: newMetadata
                }).eq('id', buoy.id);

                report.push(`Linked lamp ${record.serial} to buoy ${buoy.name}`);
            }
        }

        return NextResponse.json({
            success: true,
            created: createdCount,
            updated: updatedCount,
            details: report
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
