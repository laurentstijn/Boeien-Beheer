import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Delete ALL existing buoy assets first
        const { error: deleteAssetsError } = await supabase
            .from('assets')
            .delete()
            .eq('category', 'Boei')  // This won't work, need to join with items

        // Better approach: delete all assets where item_id is a buoy
        const { data: buoyItems } = await supabase
            .from('items')
            .select('id')
            .eq('category', 'Boei');

        if (buoyItems && buoyItems.length > 0) {
            await supabase
                .from('assets')
                .delete()
                .in('item_id', buoyItems.map(i => i.id));
        }

        // Complete inventory based on user's spreadsheet data
        const buoyInventory = [
            // JFC MARINE 1250 (Complete buoys)
            { model: "JFC MARINE 1250", color: "Rood", count: 1, isComplete: true },

            // JFC MARINE 1800 (Complete buoys)
            { model: "JFC MARINE 1800", color: "Rood", count: 2, isComplete: true },
            { model: "JFC MARINE 1800", color: "Groen", count: 2, isComplete: true },
            { model: "JFC MARINE 1800", color: "Geel", count: 9, isComplete: true },

            // SEALITE SLB 1500 (Complete buoys)
            { model: "SEALITE SLB 1500", color: "Rood", count: 1, isComplete: true },

            // MOBILIS BC1241/BC1242 (Complete + reserves)
            { model: "Mobilis BC1241/BC1242", color: "Geel", count: 4, isComplete: true },
            { model: "Mobilis BC1241/BC1242", color: "Geel Reserve", count: 6, isReserve: true },

            // MOBILIS AQ 1500 (Complete + reserves)
            { model: "Mobilis AQ1500", color: "Geel", count: 5, isComplete: true },
            { model: "Mobilis AQ1500", color: "Geel Reserve", count: 6, isReserve: true },

            // JET 9000 (Assembled modular buoys)
            { model: "JET 9000", color: "Rood", count: 1, isAssembled: true },
            { model: "JET 9000", color: "Zwart", count: 1, isAssembled: true },
            { model: "JET 9000", color: "Rood Reserve", count: 6, isReserve: true, isDrijflichaam: true },

            // JET 2000 (Assembled modular buoys)
            { model: "JET 2000", color: "Rood", count: 1, isAssembled: true },
            { model: "JET 2000", color: "Groen", count: 6, isAssembled: true },
            { model: "JET 2000", color: "Blauw/Geel", count: 2, isAssembled: true },
            { model: "JET 2000", color: "Rood Reserve", count: 4, isReserve: true, isDrijflichaam: true },
            { model: "JET 2000", color: "Groen Reserve", count: 4, isReserve: true, isDrijflichaam: true },
        ];

        const assetsToCreate = [];

        for (const buoy of buoyInventory) {
            const itemName = `${buoy.model} ${buoy.color}`;

            // Find or create item
            let { data: existingItem } = await supabase
                .from('items')
                .select('*')
                .eq('name', itemName)
                .single();

            let itemId;
            if (existingItem) {
                itemId = existingItem.id;
            } else {
                const { data: newItem, error } = await supabase
                    .from('items')
                    .insert({
                        category: 'Boei',
                        name: itemName,
                        stock_quantity: buoy.count,
                        min_stock_level: 1,
                        specs: {
                            model: buoy.model,
                            color: buoy.color.replace(' Reserve', ''),
                            isComplete: buoy.isComplete || false,
                            isAssembled: buoy.isAssembled || false,
                            isReserve: buoy.isReserve || false,
                            isDrijflichaam: buoy.isDrijflichaam || false
                        }
                    })
                    .select()
                    .single();

                if (error) {
                    console.error(`Error creating item ${itemName}:`, error);
                    continue;
                }
                itemId = newItem.id;
            }

            // Create individual assets
            for (let i = 0; i < buoy.count; i++) {
                assetsToCreate.push({
                    item_id: itemId,
                    status: 'in_stock',
                    location: 'Opslag',
                    metadata: {
                        model: buoy.model,
                        color: buoy.color.replace(' Reserve', ''),
                        isComplete: buoy.isComplete || false,
                        isAssembled: buoy.isAssembled || false,
                        isReserve: buoy.isReserve || false,
                        isDrijflichaam: buoy.isDrijflichaam || false
                    }
                });
            }
        }

        // Insert all assets
        const { data: createdAssets, error: createError } = await supabase
            .from('assets')
            .insert(assetsToCreate)
            .select();

        if (createError) {
            return Response.json({ error: `Asset create error: ${createError.message}` }, { status: 500 });
        }

        return Response.json({
            success: true,
            message: `Created ${createdAssets.length} buoy assets`,
            summary: {
                complete: buoyInventory.filter(b => b.isComplete).reduce((sum, b) => sum + b.count, 0),
                assembled: buoyInventory.filter(b => b.isAssembled).reduce((sum, b) => sum + b.count, 0),
                reserve: buoyInventory.filter(b => b.isReserve).reduce((sum, b) => sum + b.count, 0),
            },
            assets: createdAssets
        });

    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
