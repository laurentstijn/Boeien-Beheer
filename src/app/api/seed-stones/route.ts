import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // First, get the "Steen" item types from items table
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .eq('category', 'Steen');

        if (itemsError) {
            return Response.json({ error: itemsError.message }, { status: 500 });
        }

        // Define the expected stone inventory based on user's spreadsheet
        const stoneInventory = [
            { weight: "4", shape: "Ovaal", count: 3 },
            { weight: "3", shape: "Ovaal", count: 9 },
            { weight: "1.5", shape: "Rond", count: 5 },
            { weight: "1", shape: "Rond", count: 0 },
            { weight: "1.5", shape: "Plat", count: 3 },
            { weight: "0.2", shape: "Vierkant", count: 2 },
        ];

        // First, delete all existing stone assets
        const { error: deleteError } = await supabase
            .from('assets')
            .delete()
            .in('item_id', items.map(i => i.id));

        if (deleteError) {
            return Response.json({ error: `Delete error: ${deleteError.message}` }, { status: 500 });
        }

        // Now create the new assets
        const assetsToCreate = [];

        for (const stone of stoneInventory) {
            // Find or create the item type
            let itemId = items.find(i =>
                i.specs?.weight === stone.weight &&
                i.specs?.shape === stone.shape
            )?.id;

            // If item doesn't exist, create it
            if (!itemId) {
                const { data: newItem, error: createItemError } = await supabase
                    .from('items')
                    .insert({
                        category: 'Steen',
                        name: `${stone.weight}T ${stone.shape}`,
                        stock_quantity: stone.count,
                        min_stock_level: 1,
                        specs: {
                            weight: stone.weight,
                            shape: stone.shape,
                            details: `${stone.weight}T ${stone.shape}`
                        }
                    })
                    .select()
                    .single();

                if (createItemError) {
                    return Response.json({ error: `Item create error: ${createItemError.message}` }, { status: 500 });
                }
                itemId = newItem.id;
            }

            // Create individual assets
            for (let i = 0; i < stone.count; i++) {
                assetsToCreate.push({
                    item_id: itemId,
                    status: 'in_stock',
                    location: 'Opslag',
                    metadata: {
                        weight: stone.weight,
                        shape: stone.shape
                    }
                });
            }
        }

        // Insert all assets
        if (assetsToCreate.length > 0) {
            const { data: createdAssets, error: createError } = await supabase
                .from('assets')
                .insert(assetsToCreate)
                .select();

            if (createError) {
                return Response.json({ error: `Asset create error: ${createError.message}` }, { status: 500 });
            }

            return Response.json({
                success: true,
                message: `Created ${createdAssets.length} stone assets`,
                inventory: stoneInventory,
                assets: createdAssets
            });
        }

        return Response.json({
            success: true,
            message: 'No assets to create (all counts are 0)',
            inventory: stoneInventory
        });

    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
