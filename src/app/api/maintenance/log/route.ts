import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { recalculateBuoyMaintenance } from '@/lib/maintenance';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { buoy_id: buoyId, technician, service_date: date, notes: description, tide_restriction, light_character, status } = body;
        const replacements = body.replacements || {};

        // Validation
        if (!buoyId || buoyId === 'undefined') {
            return NextResponse.json({ error: 'Invalid buoy ID' }, { status: 400 });
        }

        // 0. Planning Check (Future Dates)
        const todayStr = new Date().toISOString().split('T')[0];
        const isFuture = new Date(date).toISOString().split('T')[0] > todayStr;

        if (isFuture) {
            // Check daily limit (max 2)
            const { count, error: countError } = await supabaseAdmin
                .from('planning_entries')
                .select('*', { count: 'exact', head: true })
                .eq('planned_date', date);

            if (countError) {
                console.error('Error checking planning count:', countError);
            } else if (count !== null && count >= 2) {
                return NextResponse.json({
                    error: 'Daglimiet bereikt. Er zijn al 2 boeien gepland voor deze datum.'
                }, { status: 400 });
            }

            const { data, error: planningError } = await supabaseAdmin
                .from('planning_entries')
                .insert([{
                    buoy_id: buoyId,
                    planned_date: date,
                    technician: technician,
                    notes: description
                }])
                .select()
                .single();

            if (planningError) {
                console.error('Error creating planning entry:', planningError);
                return NextResponse.json({ error: planningError.message }, { status: 500 });
            }

            return NextResponse.json({
                mode: 'planned',
                entry: data
            });
        }

        // 1. Prepare replacements and names
        const replacementNames: Record<string, string> = {};

        // Helper for swapping components
        const swapComponent = async (assetId: string, isLost: boolean, typeKey: string, categoryName: string) => {
            if (!assetId) return;

            // 1. Find an available asset of this item type
            const { data: availableAssets, error: assetError } = await supabaseAdmin
                .from('assets')
                .select('id, items(name, specs)')
                .eq('id', assetId)
                .neq('status', 'deployed')
                .limit(1)
                .single();

            if (availableAssets) {
                const newAssetId = availableAssets.id;
                const newItem: any = availableAssets.items;
                replacementNames[typeKey] = newItem.name;

                // 2. Find the OLD asset currently linked to the buoy
                const { data: buoy } = await supabaseAdmin
                    .from('deployed_buoys')
                    .select('metadata')
                    .eq('id', buoyId)
                    .single();

                const oldAssetId = buoy?.metadata?.[typeKey]?.asset_id;

                if (oldAssetId) {
                    // Update OLD asset
                    await supabaseAdmin.from('assets').update({
                        status: isLost ? 'lost' : 'maintenance',
                        location: isLost ? 'Verloren' : 'Magazijn (Onderhoud)',
                        deployment_id: null
                    }).eq('id', oldAssetId);
                }

                // 3. Deploy NEW asset
                await supabaseAdmin.from('assets').update({
                    status: 'deployed',
                    location: `Op zee (${buoyId})`,
                    deployment_id: buoyId
                }).eq('id', newAssetId);

                return {
                    ...(newItem.specs || {}),
                    type: newItem.name,
                    asset_id: newAssetId
                };
            }
            return null;
        };

        const { data: buoyData } = await supabaseAdmin.from('deployed_buoys').select('metadata').eq('id', buoyId).single();
        const newMetadata = { ...(buoyData?.metadata || {}) };

        if (replacements.buoy) {
            const result = await swapComponent(replacements.buoy, replacements.buoy_lost, 'buoy', 'Boei');
            if (result) {
                newMetadata.buoy = result;

                // IMPORTANT: When replacing the buoy itself, we must also update the deployed_buoys 
                // tracking reference if we rely on buoy_config_id or similar. 
                // For now, let's look up the new config id from the asset's item list
                const { data: assetItem } = await supabaseAdmin.from('assets').select('item_id').eq('id', result.asset_id).single();
                if (assetItem?.item_id) {
                    // This relies on the new item being a buoy configuration. Since we don't have a direct link 
                    // in this flat schema we just inject into metadata. 
                    // To keep things synced, we might need to update the basic `buoy_configurations` link if applicable.
                    newMetadata.model = result.type;
                }
            }
        }
        if (replacements.chain) {
            const result = await swapComponent(replacements.chain, replacements.chain_lost, 'chain', 'Ketting');
            if (result) newMetadata.chain = result;
        }
        if (replacements.light) {
            const result = await swapComponent(replacements.light, replacements.light_lost, 'light', 'Lamp');
            if (result) newMetadata.light = result;
        }
        if (replacements.sinker) {
            const result = await swapComponent(replacements.sinker, replacements.sinker_lost, 'sinker', 'Steen');
            if (result) newMetadata.sinker = result;
        }
        if (replacements.shackle) {
            const result = await swapComponent(replacements.shackle, replacements.shackle_lost, 'shackle', 'Sluiting');
            if (result) newMetadata.shackle = result;
        }
        if (replacements.zinc) {
            const result = await swapComponent(replacements.zinc, replacements.zinc_lost, 'zinc', 'Zinkblok');
            if (result) newMetadata.zinc = result;
        }

        // Special check: If the buoy itself was replaced, we MUST update the main deployed_buoys record
        // to point to the new asset if required, but in this system it seems the deployments 
        // exist as top-level entities `deployed_buoys` that merely hold metadata of components.
        // We will just let the metadata update handle it.

        if (body.id) {
            // Update existing log
            const { error: logError } = await supabaseAdmin
                .from('maintenance_logs')
                .update({
                    technician,
                    service_date: date,
                    description: description,
                    metadata: {
                        ...replacements,
                        replacement_names: replacementNames,
                        tide_restriction,
                        light_character,
                        status: status || 'OK'
                    }
                })
                .eq('id', body.id);

            if (logError) {
                console.error('Error updating log:', logError);
                return NextResponse.json({ error: logError.message }, { status: 500 });
            }
        } else {
            // Create new log
            const { error: logError } = await supabaseAdmin
                .from('maintenance_logs')
                .insert({
                    deployed_buoy_id: buoyId,
                    buoy_id: buoyId, // Keeping both for legacy compat
                    technician,
                    service_date: date,
                    description: description,
                    metadata: {
                        ...replacements,
                        replacement_names: replacementNames,
                        tide_restriction,
                        light_character,
                        status: status || 'OK'
                    }
                });

            if (logError) {
                console.error('Error creating log:', logError);
                return NextResponse.json({ error: logError.message }, { status: 500 });
            }
        }

        // 2. Clean up planning entries (if any exist for this buoy)
        // Since we are now registering actual maintenance, the planning is no longer needed
        await supabaseAdmin
            .from('planning_entries')
            .delete()
            .eq('buoy_id', buoyId);

        // 3. Use shared recalculation logic
        const updatedBuoy = await recalculateBuoyMaintenance(buoyId);

        return NextResponse.json({ success: true, buoy: updatedBuoy });

    } catch (error: any) {
        console.error('Maintenance log error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

