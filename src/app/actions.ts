'use server'

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { deployBuoy, retrieveBuoyWithDispositions, getZoneFilter } from '@/lib/db';
import { recalculateBuoyMaintenance } from '@/lib/maintenance';

export async function setAdminZoneOverride(zone: string | null) {
    const cookieStore = await cookies();
    if (zone) {
        cookieStore.set('admin_zone_override', zone, { path: '/' });
    } else {
        cookieStore.delete('admin_zone_override');
    }
    revalidatePath('/');
    return { success: true };
}

// Removed local client initialization in favor of shared lib
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// ...

export async function createAsset(prevState: any, formData: FormData) {
    let itemId = formData.get('itemId') as string;
    const customItemName = formData.get('customItemName') as string;
    const category = formData.get('category') as string;
    const status = formData.get('status') as string;
    const location = formData.get('location') as string;
    const notes = formData.get('notes') as string;
    const article_number = formData.get('article_number') as string;
    const swivel = formData.get('swivel') === 'on' || formData.get('swivel') === 'true';
    const hasChain = formData.get('hasChain') === 'on' || formData.get('hasChain') === 'true';
    const chain_id = formData.get('chain_id') as string;
    const brand = formData.get('brand') as string;
    const ble = formData.get('ble') === 'on' || formData.get('ble') === 'true';
    const gps = formData.get('gps') === 'on' || formData.get('gps') === 'true';
    const lamp_color = formData.get('lamp_color') as string;
    const min_stock_level = parseInt(formData.get('min_stock_level') as string) || 1;

    // If custom item is selected, create new item type first
    if (itemId === 'custom' && customItemName) {
        try {
            // 1. Check if item type already exists (by name only, since name is UNIQUE)
            // This handles the case where a user "re-creates" a type that is currently hidden (0 stock)
            // or if it was accidentally saved under a different category previously.
            const { data: existingItem } = await supabaseAdmin.from('items')
                .select('id')
                .eq('name', customItemName)
                .maybeSingle();

            if (existingItem) {
                itemId = existingItem.id;
            } else {
                // 2. Create new if not exists
                const length = formData.get('length') as string;
                const thickness = formData.get('thickness') as string;
                const weight = formData.get('weight') as string;
                const shape = formData.get('shape') as string;
                const activeZone = await getZoneFilter();

                const specs: any = { zone: activeZone };
                if (length) specs.length = length;
                if (thickness) specs.thickness = thickness;
                if (weight) specs.weight = weight;
                if (shape) specs.shape = shape;

                const { data: newItem, error: itemError } = await supabaseAdmin.from('items').insert({
                    name: customItemName,
                    category: category || 'Custom',
                    stock_quantity: 1,
                    min_stock_level: min_stock_level,
                    specs
                }).select().single();

                if (itemError) {
                    console.error('Error creating item type:', itemError);
                    return { message: 'Fout bij aanmaken van nieuw artikel type.' };
                }

                itemId = newItem.id;
            }
        } catch (e) {
            return { message: 'Er is een onverwachte fout opgetreden bij het aanmaken van artikel type.' };
        }
    }

    if (!itemId || itemId === 'custom') {
        return { message: 'Selecteer een item type of voer een custom naam in.' };
    }

    try {
        const activeZone = await getZoneFilter();
        const { error } = await supabaseAdmin.from('assets').insert({
            item_id: itemId,
            status: status || 'in_stock',
            location: location,
            zone: activeZone, // Ensure it's not invisible to normal users
            metadata: {
                notes,
                article_number,
                serial_number: article_number, // Mirror for table display
                swivel: swivel ? 'Ja' : 'Nee',
                hasChain,
                chain_id: hasChain ? chain_id : null,
                brand,
                ble,
                gps,
                color: lamp_color,
                lamp_color: lamp_color // Mirror for table display
            }
        });

        if (error) {
            console.error('Error creating asset:', error);
            return { message: 'Er is een fout opgetreden bij het aanmaken.' };
        }

        // Handle Linking if deployed
        const deployment_buoy_id = formData.get('deployment_buoy_id') as string;
        if (status === 'deployed' && deployment_buoy_id) {
            // Fetch the new asset ID (it wasn't returned by insert above, need to fix that or select it)
            const { data: newAsset } = await supabaseAdmin.from('assets')
                .select('id')
                .eq('item_id', itemId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (newAsset) {
                await linkLampToBuoy(deployment_buoy_id, newAsset.id);
            }
        }

        revalidatePath('/kettingen');
        revalidatePath('/stenen');
        revalidatePath('/boeien');
        revalidatePath('/');
        // Add other paths as needed or use a more generic revalidate
        return { message: 'Asset succesvol aangemaakt!', success: true };
    } catch (e) {
        return { message: 'Er is een onverwachte fout opgetreden.' };
    }
}

export async function updateAsset(prevState: any, formData: FormData) {
    const id = formData.get('id') as string;
    const status = formData.get('status') as string;
    const location = formData.get('location') as string;
    const notes = formData.get('notes') as string;
    const article_number = formData.get('article_number') as string;
    const swivel = formData.get('swivel') === 'on' || formData.get('swivel') === 'true';
    const hasChain = formData.get('hasChain') === 'on' || formData.get('hasChain') === 'true';
    const chain_id = formData.get('chain_id') as string;
    const brand = formData.get('brand') as string;
    const ble = formData.get('ble') === 'on' || formData.get('ble') === 'true';
    const gps = formData.get('gps') === 'on' || formData.get('gps') === 'true';
    const lamp_color = formData.get('lamp_color') as string;
    const deployment_buoy_id = formData.get('deployment_buoy_id') as string;

    // Specs
    const length = formData.get('length') as string;
    const thickness = formData.get('thickness') as string;
    const weight = formData.get('weight') as string;
    const shape = formData.get('shape') as string;

    if (!id) return { message: 'Asset ID ontbreekt.' };

    try {
        // First fetch current to get metadata
        const { data: current, error: fetchError } = await supabaseAdmin.from('assets')
            .select('status, deployment_id, metadata, items(category)')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('Error fetching asset for update:', fetchError);
            return { message: 'Ophalen asset mislukt: ' + fetchError.message };
        }

        const currentMetadata = current?.metadata || {};
        const items = current?.items as any;
        const category = Array.isArray(items) ? items[0]?.category : items?.category;

        // Determine Linking / Unlinking Actions
        const wasDeployed = current.status === 'deployed';
        const isDeployed = status === 'deployed';
        const currentBuoyId = current.deployment_id;

        // UNLINK logic: If was deployed and now not, OR was deployed to X and now to Y (unlink X first)
        if (wasDeployed && (!isDeployed || (deployment_buoy_id && deployment_buoy_id !== currentBuoyId))) {
            if (currentBuoyId) {
                let unlinkResult;
                if (category === 'Lamp') unlinkResult = await unlinkLampFromBuoy(currentBuoyId, id, status);
                else if (category === 'Ketting') unlinkResult = await unlinkChainFromBuoy(currentBuoyId, id, status);
                else if (category === 'Steen') unlinkResult = await unlinkStoneFromBuoy(currentBuoyId, id, status);
                else if (category === 'Topteken') unlinkResult = await unlinkTopmarkFromBuoy(currentBuoyId, id, status);

                if (unlinkResult && !unlinkResult.success) {
                    return { message: 'Fout bij ontkoppelen: ' + unlinkResult.message, success: false };
                }
            }
        }

        // Main Update (updates global fields not handled by link/unlink)
        // Note: unlink functions update status/location, so main update might overwrite fields like notes
        // We run main update anyway to ensure all fields are synced.
        const { error } = await supabaseAdmin.from('assets').update({
            status,
            location: isDeployed && deployment_buoy_id ? undefined : location, // Don't overwrite location if deploying to buoy (link function handles it)
            deployment_id: isDeployed && deployment_buoy_id ? deployment_buoy_id : (wasDeployed && !isDeployed ? null : current.deployment_id),
            metadata: {
                ...currentMetadata,
                notes,
                article_number,
                serial_number: article_number, // Mirror for table display
                swivel: swivel ? 'Ja' : 'Nee',
                hasChain,
                chain_id: hasChain ? chain_id : null,
                brand,
                ble,
                gps,
                color: lamp_color,
                lamp_color: lamp_color, // Mirror for table display
                // Add specs if present (overrides item type specs)
                ...(length ? { length } : {}),
                ...(thickness ? { thickness } : {}),
                ...(weight ? { weight } : {}),
                ...(shape ? { shape } : {})
            }
        }).eq('id', id);

        if (error) {
            console.error('Error updating asset:', error, 'ID:', id);
            return { message: 'Update mislukt: ' + error.message + ' (' + error.code + ')' };
        }

        // LINK logic: If is deployed and has buoy ID
        if (isDeployed && deployment_buoy_id && deployment_buoy_id !== currentBuoyId) {
            let linkResult;
            if (category === 'Lamp') linkResult = await linkLampToBuoy(deployment_buoy_id, id);
            else if (category === 'Ketting') linkResult = await linkChainToBuoy(deployment_buoy_id, id);
            else if (category === 'Steen') linkResult = await linkStoneToBuoy(deployment_buoy_id, id);
            else if (category === 'Topteken') linkResult = await linkTopmarkToBuoy(deployment_buoy_id, id);

            if (linkResult && !linkResult.success) {
                return { message: 'Asset opgeslagen, maar koppelen mislukt: ' + linkResult.message, success: false };
            }
        }

        revalidatePath('/kettingen');
        revalidatePath('/stenen');
        revalidatePath('/boeien');
        revalidatePath('/');
        return { message: 'Asset succesvol bijgewerkt!', success: true };
    } catch (e: any) {
        return { message: 'Er is een onverwachte fout opgetreden: ' + e.message };
    }
}

export async function deleteAsset(id: string) {
    try {
        // Check if asset is deployed
        const { data: asset } = await supabaseAdmin.from('assets')
            .select('status, deployment_id')
            .eq('id', id)
            .single();

        if (asset?.status === 'deployed' || asset?.deployment_id) {
            return { message: 'Deze asset is nog in gebruik (uitgelegd). Ontkoppel hem eerst.', success: false };
        }

        const { error } = await supabaseAdmin.from('assets').delete().eq('id', id);
        if (error) throw error;

        revalidatePath('/kettingen');
        revalidatePath('/stenen');
        revalidatePath('/boeien');
        revalidatePath('/lampen');
        return { message: 'Asset verwijderd.', success: true };
    } catch (e: any) {
        console.error('Delete error:', e);
        return { message: 'Kon asset niet verwijderen: ' + (e.message || 'Onbekende fout'), success: false };
    }
}

export async function deployBuoyAction(prevState: any, formData: FormData) {
    const name = formData.get('name') as string;
    const lat = parseFloat(formData.get('lat') as string);
    const lng = parseFloat(formData.get('lng') as string);
    const notes = formData.get('notes') as string;

    const buoy_id = formData.get('buoy_id') as string;

    // Components (optional)
    const chain_id = formData.get('chain_id') as string || undefined;
    const stone_id = formData.get('stone_id') as string || undefined;
    const lamp_id = formData.get('lamp_id') as string || undefined;
    const topmark_id = formData.get('topmark_id') as string || undefined;

    const light_character = formData.get('light_character') as string || undefined;
    const is_external_customer = formData.get('is_external_customer') === 'true';
    const customer_name = formData.get('customer_name') as string || undefined;
    const photo = formData.get('photo') as File | null;

    if (!buoy_id) return { message: 'Geen boei geselecteerd.', success: false };
    if (!name) return { message: 'Naam is verplicht.', success: false };
    if (isNaN(lat) || isNaN(lng)) return { message: 'Ongeldige GPS coördinaten.', success: false };

    try {
        let photo_url = undefined;
        if (photo && photo.size > 0) {
            const fileExt = photo.name.split('.').pop();
            const fileName = `deploy_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabaseAdmin.storage
                .from('buoy-photos')
                .upload(fileName, photo, { contentType: photo.type });

            if (!uploadError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('buoy-photos')
                    .getPublicUrl(fileName);
                photo_url = publicUrl;
                console.log('>>> [deployBuoyAction] PHOTO UPLOAD SUCCESS:', photo_url);
            } else {
                console.error('>>> [deployBuoyAction] PHOTO UPLOAD FAILED:', uploadError);
            }
        }

        console.log('>>> [deployBuoyAction] Calling deployBuoy...');
        await deployBuoy({
            name,
            location: { lat, lng },
            buoy_id,
            components: {
                chain_id,
                stone_id,
                lamp_id,
                topmark_id
            },
            notes,
            light_character,
            photo_url,
            is_external_customer,
            customer_name
        });

        revalidatePath('/');
        revalidatePath('/boeien');
        revalidatePath('/kettingen');
        revalidatePath('/stenen');
        revalidatePath('/uitgelegd');

        console.log('>>> [deployBuoyAction] COMPLETED SUCCESS');
        return { message: 'Boei succesvol uitgelegd!', success: true };
    } catch (e: any) {
        console.error('>>> [deployBuoyAction] CRITICAL ERROR:', e);
        return { message: 'Fout bij uitleggen: ' + (e.message || 'Onbekende fout'), success: false };
    }
}

export async function retrieveBuoyWithDispositionsAction(id: string, dispositions: Record<string, string>) {
    try {
        await retrieveBuoyWithDispositions(id, dispositions);

        revalidatePath('/');
        revalidatePath('/uitgelegd');
        revalidatePath('/boeien');
        revalidatePath('/kettingen');
        revalidatePath('/stenen');
        revalidatePath('/lampen');

        return { success: true, message: 'Boei succesvol binnengehaald. Voorraad is bijgewerkt op basis van conditie.' };
    } catch (e: any) {
        console.error('Retrieve deployment error:', e);
        return { success: false, message: 'Fout bij het terughalen van de boei: ' + e.message };
    }
}

export async function incrementStock(category: string, itemName: string) {
    try {
        // 1. Find the Item ID by exact name
        const { data: item, error: itemError } = await supabaseAdmin.from('items')
            .select('id, category')
            .eq('name', itemName) // Use exact match
            .single();

        if (itemError || !item) {
            console.error('Item not found for stock increment:', itemName);
            // Fallback: Try case-insensitive search if exact fail
            const { data: itemFallback, error: fallbackError } = await supabaseAdmin.from('items')
                .select('id, category')
                .ilike('name', itemName)
                .limit(1)
                .single();

            if (fallbackError || !itemFallback) {
                return { message: `Artikel type niet gevonden: ${itemName}`, success: false };
            }
            // Use fallback
            return await createStockAsset(itemFallback.id, category);
        }

        return await createStockAsset(item.id, category);

    } catch (e) {
        console.error('Increment error:', e);
        return { message: 'Onverwachte fout.', success: false };
    }
}

async function createStockAsset(itemId: string, category: string) {
    const activeZone = await getZoneFilter();
    const { error: insertError } = await supabaseAdmin.from('assets').insert({
        item_id: itemId,
        status: 'in_stock',
        location: 'Magazijn',
        zone: activeZone,
        metadata: {
            // minimal metadata, we rely on item_id linkage
            created_via: 'stock_increment'
        }
    });

    if (insertError) {
        console.error('Insert error:', insertError);
        return { message: 'Fout bij toevoegen voorraad.', success: false };
    }

    revalidatePath('/boeien');
    revalidatePath('/kettingen');
    revalidatePath('/stenen');
    return { message: 'Voorraad bijgewerkt.', success: true };
}

export async function decrementStock(category: string, itemName: string) {
    try {
        // 1. Find the Item ID
        const { data: item, error: itemError } = await supabaseAdmin.from('items')
            .select('id')
            .eq('name', itemName)
            .single();

        if (itemError || !item) {
            // Fallback search
            const { data: itemFallback } = await supabaseAdmin.from('items')
                .select('id')
                .ilike('name', itemName)
                .limit(1)
                .single();

            if (!itemFallback) return { message: 'Item type niet gevonden.', success: false };
            return await deleteStockAsset(itemFallback.id);
        }

        return await deleteStockAsset(item.id);

    } catch (e) {
        console.error('Decrement error:', e);
        return { message: 'Onverwachte fout.', success: false };
    }
}

async function deleteStockAsset(itemId: string) {
    const activeZone = await getZoneFilter();
    // Find ANY asset of this type in stock in the current zone
    let query = supabaseAdmin.from('assets')
        .select('id')
        .eq('item_id', itemId)
        .eq('status', 'in_stock');

    if (activeZone) {
        query = query.eq('zone', activeZone);
    }

    const { data: assetToDelete, error: findError } = await query.limit(1).single();

    if (findError || !assetToDelete) {
        return { message: 'Geen vrije voorraad gevonden om te verwijderen.', success: false };
    }

    // Delete it
    const { error } = await supabaseAdmin.from('assets').delete().eq('id', assetToDelete.id);
    if (error) {
        return { message: 'Fout bij verwijderen van voorraad.', success: false };
    }

    revalidatePath('/kettingen');
    revalidatePath('/stenen');
    return { message: 'Voorraad bijgewerkt.', success: true };
}

export async function migrateStoneSpecs() {
    try {
        const { data: items, error } = await supabaseAdmin.from('items')
            .select('*')
            .eq('category', 'Steen');

        if (error) throw error;

        let count = 0;

        for (const item of items) {
            // Skip if already has specs (optional, depends if we want to force update)
            if (item.specs?.weight && item.specs?.shape) continue;

            const nameParts = item.name.match(/(\d+(?:\.\d+)?)T?\s+(\w+)/i);
            let weight = '';
            let shape = '';

            if (nameParts) {
                weight = nameParts[1] + 'T'; // e.g. "4" -> "4T"
                shape = nameParts[2]; // e.g. "Ovaal"
            } else if (item.details) {
                // Fallback to details if regex fails
                shape = item.details;
                // Try to extract weight from name if details didn't have it, but usually name has it
            }

            if (weight || shape) {
                const newSpecs = {
                    ...item.specs,
                    weight: weight || item.specs?.weight,
                    shape: shape || item.specs?.shape
                };

                await supabaseAdmin.from('items')
                    .update({ specs: newSpecs })
                    .eq('id', item.id);

                count++;
            }
        }

        revalidatePath('/stenen');
        return { success: true, message: `Migrated ${count} items.` };
    } catch (e: any) {
        console.error('Migration error:', e);
        return { success: false, message: e.message };
    }
}

export async function linkLampToBuoy(buoyId: string, lampAssetId: string) {
    try {
        // 1. Get lamp details
        const { data: asset, error: assetError } = await supabaseAdmin.from('assets')
            .select('metadata, item_id, items!item_id(name)')
            .eq('id', lampAssetId)
            .single();

        if (assetError || !asset) throw new Error('Lamp niet gevonden');

        const lamp = asset as any;
        const lampType = Array.isArray(lamp.items) ? lamp.items[0]?.name : lamp.items?.name;

        // 2. Get buoy details to get name
        const { data: buoy, error: buoyError } = await supabaseAdmin.from('deployed_buoys')
            .select('name, metadata')
            .eq('id', buoyId)
            .single();

        if (buoyError || !buoy) throw new Error('Boei niet gevonden');

        // 3. Update Asset: Status deployed, location = buoy name, deployment_id = buoyId
        const { error: updateAssetError } = await supabaseAdmin.from('assets')
            .update({
                status: 'deployed',
                location: `Boei ${buoy.name}`,
                deployment_id: buoyId
            })
            .eq('id', lampAssetId);

        if (updateAssetError) throw new Error('Fout bij updaten lamp status');

        // 4. Update Deployed Buoy Metadata: Add light info

        const newMetadata = {
            ...buoy.metadata,
            light: {
                ...lamp.metadata,
                type: lampType || 'Onbekend',
                asset_id: lampAssetId,
                ble: lamp.metadata?.ble || false,
                gps: lamp.metadata?.gps || false,
                color: lamp.metadata?.color || '-'
            }
        };

        const { error: updateBuoyError } = await supabaseAdmin.from('deployed_buoys')
            .update({ metadata: newMetadata })
            .eq('id', buoyId);

        if (updateBuoyError) throw new Error('Fout bij updaten boei metadata');

        revalidatePath('/gravel');
        revalidatePath('/uitgelegd');
        revalidatePath('/lampen');
        return { success: true, message: 'Lamp succesvol gekoppeld.' };
    } catch (e: any) {
        console.error('Link error:', e);
        return { success: false, message: e.message };
    }
}

export async function unlinkLampFromBuoy(buoyId: string, lampAssetId: string, targetStatus: string = 'in_stock') {
    try {
        // 1. Update Asset: Status targetStatus, location = Magazijn, deployment_id = null
        const { error: updateAssetError } = await supabaseAdmin.from('assets')
            .update({
                status: targetStatus,
                location: 'Magazijn',
                deployment_id: null
            })
            .eq('id', lampAssetId);

        if (updateAssetError) throw new Error('Fout bij updaten lamp status');

        // 2. Get buoy metadata
        const { data: buoy, error: buoyError } = await supabaseAdmin.from('deployed_buoys')
            .select('metadata')
            .eq('id', buoyId)
            .single();

        if (buoyError || !buoy) throw new Error('Boei niet gevonden');

        // 3. Remove light from metadata
        const newMetadata = { ...buoy.metadata };
        delete newMetadata.light;

        const { error: updateBuoyError } = await supabaseAdmin.from('deployed_buoys')
            .update({ metadata: newMetadata })
            .eq('id', buoyId);

        if (updateBuoyError) throw new Error('Fout bij updaten boei metadata');

        revalidatePath('/gravel');
        revalidatePath('/uitgelegd');
        revalidatePath('/lampen');
        return { success: true, message: 'Lamp succesvol ontkoppeld.' };
    } catch (e: any) {
        console.error('Unlink error:', e);
        return { success: false, message: e.message };
    }
}

export async function linkChainToBuoy(buoyId: string, chainAssetId: string) {
    try {
        const { data: asset, error: assetError } = await supabaseAdmin.from('assets')
            .select('metadata, items!item_id(name)')
            .eq('id', chainAssetId)
            .single();

        if (assetError || !asset) throw new Error('Ketting niet gevonden');

        const { data: buoy, error: buoyError } = await supabaseAdmin.from('deployed_buoys')
            .select('name, metadata')
            .eq('id', buoyId)
            .single();

        if (buoyError || !buoy) throw new Error('Boei niet gevonden');

        // Update Asset
        const { error: updateAssetError } = await supabaseAdmin.from('assets')
            .update({
                status: 'deployed',
                location: `Boei ${buoy.name}`,
                deployment_id: buoyId
            })
            .eq('id', chainAssetId);

        if (updateAssetError) throw new Error('Fout bij updaten ketting status');

        // Update Buoy Metadata
        const chainName = Array.isArray((asset as any).items) ? (asset as any).items[0]?.name : (asset as any).items?.name;
        const newMetadata = {
            ...buoy.metadata,
            chain: {
                ...asset.metadata,
                type: chainName || 'Onbekend',
                asset_id: chainAssetId
            }
        };

        const { error: updateBuoyError } = await supabaseAdmin.from('deployed_buoys')
            .update({ metadata: newMetadata })
            .eq('id', buoyId);

        if (updateBuoyError) throw new Error('Fout bij updaten boei metadata');

        revalidatePath('/gravel');
        revalidatePath('/uitgelegd');
        revalidatePath('/kettingen');
        return { success: true, message: 'Ketting succesvol gekoppeld.' };
    } catch (e: any) {
        console.error('Link Chain error:', e);
        return { success: false, message: e.message };
    }
}

export async function unlinkChainFromBuoy(buoyId: string, chainAssetId: string, targetStatus: string = 'in_stock') {
    try {
        await supabaseAdmin.from('assets').update({
            status: targetStatus,
            location: 'Magazijn',
            deployment_id: null
        }).eq('id', chainAssetId);

        const { data: buoy } = await supabaseAdmin.from('deployed_buoys').select('metadata').eq('id', buoyId).single();
        if (buoy) {
            const newMetadata = { ...buoy.metadata };
            delete newMetadata.chain;
            await supabaseAdmin.from('deployed_buoys').update({ metadata: newMetadata }).eq('id', buoyId);
        }

        revalidatePath('/uitgelegd');
        revalidatePath('/kettingen');
        return { success: true, message: 'Ketting ontkoppeld.' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function linkStoneToBuoy(buoyId: string, stoneAssetId: string) {
    try {
        const { data: asset, error: assetError } = await supabaseAdmin.from('assets')
            .select('metadata, items!item_id(name)')
            .eq('id', stoneAssetId)
            .single();

        if (assetError || !asset) throw new Error('Steen niet gevonden');

        const { data: buoy, error: buoyError } = await supabaseAdmin.from('deployed_buoys')
            .select('name, metadata')
            .eq('id', buoyId)
            .single();

        if (buoyError || !buoy) throw new Error('Boei niet gevonden');

        // Update Asset
        const { error: updateAssetError } = await supabaseAdmin.from('assets')
            .update({
                status: 'deployed',
                location: `Boei ${buoy.name}`,
                deployment_id: buoyId
            })
            .eq('id', stoneAssetId);

        if (updateAssetError) throw new Error('Fout bij updaten steen status');

        // Update Buoy Metadata (using 'sinker' key as per db.ts map)
        const newMetadata = {
            ...buoy.metadata,
            sinker: {
                ...asset.metadata,
                type: (Array.isArray((asset as any).items) ? (asset as any).items[0]?.name : (asset as any).items?.name) || 'Onbekend',
                asset_id: stoneAssetId
            }
        };

        const { error: updateBuoyError } = await supabaseAdmin.from('deployed_buoys')
            .update({ metadata: newMetadata })
            .eq('id', buoyId);

        if (updateBuoyError) throw new Error('Fout bij updaten boei metadata');

        revalidatePath('/gravel');
        revalidatePath('/uitgelegd');
        revalidatePath('/stenen');
        return { success: true, message: 'Steen succesvol gekoppeld.' };
    } catch (e: any) {
        console.error('Link Stone error:', e);
        return { success: false, message: e.message };
    }
}

export async function unlinkStoneFromBuoy(buoyId: string, stoneAssetId: string, targetStatus: string = 'in_stock') {
    try {
        await supabaseAdmin.from('assets').update({
            status: targetStatus,
            location: 'Magazijn',
            deployment_id: null
        }).eq('id', stoneAssetId);

        const { data: buoy } = await supabaseAdmin.from('deployed_buoys').select('metadata').eq('id', buoyId).single();
        if (buoy) {
            const newMetadata = { ...buoy.metadata };
            delete newMetadata.sinker;
            await supabaseAdmin.from('deployed_buoys').update({ metadata: newMetadata }).eq('id', buoyId);
        }

        revalidatePath('/uitgelegd');
        revalidatePath('/stenen');
        return { success: true, message: 'Steen ontkoppeld.' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function linkTopmarkToBuoy(buoyId: string, topmarkAssetId: string) {
    try {
        const { data: asset, error: assetError } = await supabaseAdmin.from('assets')
            .select('metadata, items!item_id(name)')
            .eq('id', topmarkAssetId)
            .single();

        if (assetError || !asset) throw new Error('Topteken niet gevonden');

        const { data: buoy, error: buoyError } = await supabaseAdmin.from('deployed_buoys')
            .select('name, metadata')
            .eq('id', buoyId)
            .single();

        if (buoyError || !buoy) throw new Error('Boei niet gevonden');

        // Update Asset
        const { error: updateAssetError } = await supabaseAdmin.from('assets')
            .update({
                status: 'deployed',
                location: `Boei ${buoy.name}`,
                deployment_id: buoyId
            })
            .eq('id', topmarkAssetId);

        if (updateAssetError) throw new Error('Fout bij updaten topteken status');

        // Update Buoy Metadata (using 'topmark' key)
        const topmarkName = Array.isArray((asset as any).items) ? (asset as any).items[0]?.name : (asset as any).items?.name;

        const newMetadata = {
            ...buoy.metadata,
            topmark: {
                ...asset.metadata,
                type: topmarkName || 'Onbekend',
                asset_id: topmarkAssetId
            }
        };

        const { error: updateBuoyError } = await supabaseAdmin.from('deployed_buoys')
            .update({ metadata: newMetadata })
            .eq('id', buoyId);

        if (updateBuoyError) throw new Error('Fout bij updaten boei metadata');

        revalidatePath('/gravel');
        revalidatePath('/uitgelegd');
        revalidatePath('/toptekens'); // Assuming path
        return { success: true, message: 'Topteken succesvol gekoppeld.' };
    } catch (e: any) {
        console.error('Link Topmark error:', e);
        return { success: false, message: e.message };
    }
}

export async function unlinkTopmarkFromBuoy(buoyId: string, topmarkAssetId: string, targetStatus: string = 'in_stock') {
    try {
        await supabaseAdmin.from('assets').update({
            status: targetStatus,
            location: 'Magazijn',
            deployment_id: null
        }).eq('id', topmarkAssetId);

        const { data: buoy } = await supabaseAdmin.from('deployed_buoys').select('metadata').eq('id', buoyId).single();
        if (buoy) {
            const newMetadata = { ...buoy.metadata };
            delete newMetadata.topmark;
            await supabaseAdmin.from('deployed_buoys').update({ metadata: newMetadata }).eq('id', buoyId);
        }

        revalidatePath('/uitgelegd');
        revalidatePath('/toptekens');
        return { success: true, message: 'Topteken ontkoppeld.' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
export async function updateMaintenanceHistory(id: string, description: string) {
    try {
        const { error } = await supabaseAdmin.from('maintenance_history')
            .update({ description })
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/uitgelegd');
        return { success: true };
    } catch (e: any) {
        console.error('Update history error:', e);
        return { success: false, message: e.message };
    }
}

export async function deleteMaintenanceHistory(id: string) {
    try {
        // 1. Get buoy ID first
        const { data: log } = await supabaseAdmin.from('maintenance_logs')
            .select('buoy_id')
            .eq('id', id)
            .single();

        if (!log) throw new Error('Log niet gevonden');

        // 2. Delete the log
        const { error } = await supabaseAdmin.from('maintenance_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 3. Recalculate buoy dates/status based on remaining logs
        const updatedBuoy = await recalculateBuoyMaintenance(log.buoy_id);

        revalidatePath('/uitgelegd');
        return { success: true, buoy: updatedBuoy };
    } catch (e: any) {
        console.error('Delete history error:', e);
        return { success: false, message: e.message };
    }
}

// ─────────────────────────────────────────────────────────────
// Minimum Stock Level Management
// ─────────────────────────────────────────────────────────────

export async function updateItemMinStock(itemId: string, minStock: number) {
    try {
        const { error } = await supabaseAdmin.from('items')
            .update({ min_stock_level: minStock })
            .eq('id', itemId);

        if (error) throw error;

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (e: any) {
        console.error('Min stock update error:', e);
        return { success: false, message: e.message };
    }
}

export async function updateItemMinStockBulk(prevState: any, formData: FormData) {
    try {
        const updates: { id: string; min_stock_level: number }[] = [];

        for (const [key, value] of formData.entries()) {
            if (key.startsWith('min_stock_')) {
                const itemId = key.replace('min_stock_', '');
                const minStock = parseInt(value as string, 10);
                if (!isNaN(minStock) && minStock >= 0) {
                    updates.push({ id: itemId, min_stock_level: minStock });
                }
            }
        }

        for (const update of updates) {
            await supabaseAdmin.from('items')
                .update({ min_stock_level: update.min_stock_level })
                .eq('id', update.id);
        }

        revalidatePath('/lage-voorraad');
        revalidatePath('/instellingen');
        return { success: true, message: `${updates.length} item(s) bijgewerkt.` };
    } catch (e: any) {
        console.error('Bulk min stock update error:', e);
        return { success: false, message: e.message };
    }
}

export async function deleteItemType(itemId: string) {
    try {
        // Safety check: make sure no assets exist for this item
        const { count } = await supabaseAdmin.from('assets')
            .select('id', { count: 'exact', head: true })
            .eq('item_id', itemId);

        if (count && count > 0) {
            return { success: false, message: `Dit articletype heeft nog ${count} gekoppelde assets. Verwijder die eerst.` };
        }

        const { error } = await supabaseAdmin.from('items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        revalidatePath('/lage-voorraad');
        revalidatePath('/instellingen');
        return { success: true };
    } catch (e: any) {
        console.error('Delete item type error:', e);
        return { success: false, message: e.message };
    }
}

export async function deleteItemTypesBulk(itemIds: string[]) {
    const results = await Promise.all(itemIds.map(id => deleteItemType(id)));
    const failed = results.filter(r => !r.success);
    revalidatePath('/lage-voorraad');
    revalidatePath('/instellingen');
    if (failed.length > 0) {
        return { success: false, message: `${failed.length} types konden niet worden verwijderd (hebben nog assets).` };
    }
    return { success: true, message: `${itemIds.length} types verwijderd.` };
}
export async function uploadBuoyPhoto(formData: FormData) {
    const file = formData.get('photo') as File;
    const buoyId = formData.get('buoyId') as string;

    if (!file || !buoyId) {
        return { success: false, message: 'Geen bestand of boei ID' };
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${buoyId}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError }: any = await supabaseAdmin.storage
            .from('buoy-photos')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('buoy-photos')
            .getPublicUrl(filePath);

        // Update the buoy metadata
        const { data: buoy, error: fetchError } = await supabaseAdmin.from('deployed_buoys')
            .select('metadata')
            .eq('id', buoyId)
            .single();

        if (fetchError) throw fetchError;

        const newMetadata = {
            ...(buoy.metadata || {}),
            photo_url: publicUrl
        };

        const { error: updateError } = await supabaseAdmin.from('deployed_buoys')
            .update({ metadata: newMetadata })
            .eq('id', buoyId);

        if (updateError) throw updateError;

        revalidatePath('/uitgelegd');
        return { success: true, url: publicUrl };
    } catch (e: any) {
        console.error('Upload error:', e);
        return { success: false, message: e.message };
    }
}

export async function updateStockCountDate(date: string) {
    try {
        const { error } = await supabaseAdmin.from('app_settings')
            .upsert({
                key: 'last_stock_count_date',
                value: date,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Supabase error updating date:', error);
            if (error.message.includes('not find the table')) {
                return {
                    success: false,
                    message: "Database tabel 'app_settings' ontbreekt. Voer de SQL uit in Supabase.",
                    isTableMissing: true
                };
            }
            throw error;
        }

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (e: any) {
        console.error('Update stock count date error:', e);
        return { success: false, message: e.message };
    }
}

// -----------------------------------------------------
// MANUALS LIBRARY
// -----------------------------------------------------

export async function listManualsAction(prefix: string = '') {
    try {
        const { data, error } = await supabaseAdmin.storage.from('manuals').list(prefix, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
        });
        if (error) throw error;

        // Filter out internal config files, empty folder placeholders and metadata-less folders
        const pdfs = (data || []).filter(f =>
            !f.name.startsWith('.emptyFolderPlaceholder') &&
            !f.name.startsWith('config') &&
            f.metadata !== null
        );

        return { success: true, data: pdfs };
    } catch (err: any) {
        console.error('Error listing manuals:', err);
        return { success: false, message: err.message || 'Kon handleidingen niet laden' };
    }
}

export async function uploadManualAction(formData: FormData, prefix: string = '') {
    const file = formData.get('file') as File;
    if (!file) return { success: false, message: 'Geen bestand geselecteerd' };

    try {
        const path = prefix ? `${prefix}${file.name}` : file.name;
        const { error: uploadError } = await supabaseAdmin.storage
            .from('manuals')
            .upload(path, file, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) throw uploadError;
        return { success: true };
    } catch (error: any) {
        console.error('Manual upload error:', error);
        return { success: false, message: error.message || 'Upload gefaald' };
    }
}

export async function deleteManualAction(filename: string, prefix: string = '') {
    try {
        const path = prefix ? `${prefix}${filename}` : filename;
        const { error } = await supabaseAdmin.storage.from('manuals').remove([path]);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Manual delete error:', error);
        return { success: false, message: error.message || 'Verwijderen gefaald' };
    }
}
