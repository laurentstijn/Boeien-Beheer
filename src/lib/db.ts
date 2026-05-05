import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';
import { DeployedBuoy } from './data';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Helper to determine the correct zone filter based on the logged-in user
export async function getZoneFilter(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const ssrSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); }
                }
            }
        );
        const { data: { user } } = await ssrSupabase.auth.getUser();
        if (!user) return null;

        const role = user.user_metadata?.role;
        const userZone = user.user_metadata?.zone;

        if (role === 'admin') {
            const override = cookieStore.get('admin_zone_override')?.value;
            console.log("[db.ts] getZoneFilter - IS ADMIN. Override cookie:", override);
            if (override && override !== 'all') {
                return override;
            }
            return null; // 'all' means no filter applies, see all zones
        }
        console.log("[db.ts] getZoneFilter - NORMAL USER. userZone:", userZone);
        return userZone || null;
    } catch (e) {
        console.error("[db.ts] getZoneFilter - ERROR:", e);
        return null;
    }
}

export async function getDeployedBuoys(includeArchived: boolean = false): Promise<DeployedBuoy[]> {
    const zoneFilter = await getZoneFilter();
    let query = supabaseAdmin
        .from('deployed_buoys')
        .select(`
      *,
      buoy_configurations (
        name,
        metadata
      ),
      maintenance_logs!deployed_buoy_id (
        description,
        service_date
      )
    `)
        .order('last_service_date', { foreignTable: 'maintenance_logs!deployed_buoy_id', ascending: false })
        .limit(1, { foreignTable: 'maintenance_logs!deployed_buoy_id' });

    if (zoneFilter) {
        query = query.eq('zone', zoneFilter);
    }

    if (!includeArchived) {
        query = query.neq('status', 'Archived');
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching deployed buoys:', error);
        return [];
    }

    // Collect all buoy IDs and lamp asset_ids referenced in metadata.light.asset_id
    const buoyIds: string[] = data.map((b: any) => b.id);
    const lampAssetIds: string[] = [];
    for (const buoy of data) {
        const assetId = buoy.metadata?.light?.asset_id;
        if (assetId) lampAssetIds.push(assetId);
    }

    // Fetch ALL deployed lamp assets in one query, matching by deployment_id.
    // This covers lamps linked via seed-lamps (which store deployment_id on the asset)
    // as well as lamps linked via asset_id in metadata.
    let lampByDeploymentId: Record<string, any> = {};  // keyed by buoy id
    let lampByAssetId: Record<string, any> = {};       // keyed by asset id

    if (buoyIds.length > 0) {
        // Fetch ALL assets deployed on these buoys to avoid complex table join failures 
        const { data: deployedLamps } = await supabaseAdmin
            .from('assets')
            .select('id, metadata, deployment_id, item_id')
            .in('deployment_id', buoyIds);

        if (deployedLamps) {
            // We need to fetch items to know which ones are lamps (category === 'Lamp')
            // To do this reliably, we'll collect all item_ids and query them separately
            const itemIds = [...new Set(deployedLamps.map(a => a.item_id).filter(Boolean))];

            let lampItemIds = new Set<string>();
            if (itemIds.length > 0) {
                const { data: items } = await supabaseAdmin
                    .from('items')
                    .select('id, category')
                    .in('id', itemIds)
                    .eq('category', 'Lamp');

                if (items) {
                    items.forEach(i => lampItemIds.add(i.id));
                }
            }

            for (const asset of deployedLamps) {
                // If the asset belongs to an item that is a 'Lamp', or if the metadata explicitly says Lamp/Carmanah (fallback)
                const isLamp = lampItemIds.has(asset.item_id) ||
                    (asset.metadata?.type || '').toLowerCase().includes('lamp') ||
                    (asset.metadata?.manufacturer || '').toLowerCase().includes('carmanah');

                if (isLamp && asset.deployment_id) {
                    lampByDeploymentId[asset.deployment_id] = asset;
                }
                if (asset.deployment_id) {
                    lampByAssetId[asset.id] = asset;
                }
            }
        }
    }

    // Also fetch any explicitly referenced assets by asset_id in metadata
    const extraAssetIds = lampAssetIds.filter(id => !lampByAssetId[id]);
    if (extraAssetIds.length > 0) {
        const { data: extraAssets } = await supabaseAdmin
            .from('assets')
            .select('id, metadata')
            .in('id', extraAssetIds);
        if (extraAssets) {
            for (const asset of extraAssets) {
                lampByAssetId[asset.id] = asset;
            }
        }
    }

    return data.map((buoy: any) => {
        // Parse location point (x,y) string if needed, or use PostGIS helpers in query.
        // Standard postgres point is returned as string "(x,y)" or object depending on driver.
        // Supabase JS often returns string for point, or GeoJSON if we select it as such.
        // Let's assume string "(51.23,4.41)" for now and parse it.
        let lat = 0;
        let lng = 0;
        if (typeof buoy.location === 'string') {
            const parts = buoy.location.replace(/[()]/g, '').split(',');
            if (parts.length === 2) {
                lat = parseFloat(parts[0]);
                lng = parseFloat(parts[1]);
            }
        } else if (typeof buoy.location === 'object' && buoy.location !== null) {
            // if it's already an object (e.g. {x: 51.23, y: 4.41})
            lat = buoy.location.x;
            lng = buoy.location.y;
        }

        // Map metadata back to our domain model
        const metadata = buoy.metadata || {};

        // Buoy type derivation:
        // 1. From buoy_configurations join
        // 2. From metadata.model 
        // 3. Fallback to 'Onbekend'
        const buoyTypeName = buoy.buoy_configurations?.name || metadata.model || 'Onbekend';

        // Resolve the lamp serial number: prefer live data from assets table,
        // fall back to the snapshot stored in metadata.light at deployment time.
        let lightData = metadata.light ? { ...metadata.light } : null;
        // Resolve live lamp: check by deployment_id first (seed-lamps path),
        // then fall back to explicit asset_id stored in metadata.light.
        const linkedLampAssetId = metadata.light?.asset_id;
        const liveAsset = lampByDeploymentId[buoy.id] || (linkedLampAssetId ? lampByAssetId[linkedLampAssetId] : null);
        if (liveAsset) {
            const liveMeta = liveAsset.metadata || {};
            // First priority: dedicated serial_number column on assets table
            const liveSerial =
                liveMeta.serial_number ||
                liveMeta.serialNumber ||
                liveMeta.article_number ||
                liveMeta.s_n ||
                null;
            if (liveSerial) {
                lightData = {
                    ...lightData,
                    serialNumber: liveSerial,
                    type: lightData?.type || lightData?.name || liveMeta.type || liveMeta.brand || '',
                };
            }
        }

        // Final serial number resolution from whichever source we have
        const resolvedLight = lightData ? {
            ...lightData,
            serialNumber: lightData.serialNumber || lightData.serial_number || lightData.article_number || '',
            type: lightData.type || lightData.name || ''
        } : { serialNumber: '', type: '' };

        return {
            id: buoy.id,
            name: buoy.name || `Boei ${buoy.id.slice(0, 4)}`,
            date: buoy.deployment_date,
            status: buoy.status || 'OK',
            buoyConfigId: buoy.buoy_config_id,
            buoyType: {
                name: buoyTypeName,
                color: (metadata.color || 'yellow').toLowerCase()
            },
            chain: metadata.chain || { type: 'Zwart', length: '', thickness: '' },
            sinker: metadata.sinker || { weight: '', type: '' },
            light: resolvedLight,
            topmark: metadata.topmark || '',
            shackles: '',
            notes: buoy.notes || '',
            location: { lat, lng },
            metadata: metadata,
            tideRestriction: buoy.tide_restriction || 'Altijd',
            lastServiceDate: buoy.last_service_date,
            nextServiceDue: buoy.next_service_due,
            lightCharacter: buoy.light_character,
            lastServiceNotes: buoy.maintenance_logs?.[0]?.description
        };
    });
}

export async function getBuoyConfigurations() {
    const { data, error } = await supabase
        .from('buoy_configurations')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching buoy configurations:', error);
        return [];
    }

    return data;
}

import { InventoryItem } from './data';

export async function getInventoryItems(category?: string): Promise<InventoryItem[]> {
    const zoneFilter = await getZoneFilter();
    let query = supabaseAdmin.from('items').select('*'); // Using items table, which currently has no zone, but if assets are filtered we're good. Wait, items table is global.
    // Inventory Items returned here just lists the catalog. We need to filter the stock count?
    // Actually getInventoryItems is not heavily used in the new setup, we rely on individual asset counts.

    if (category && category !== 'All') {
        query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching inventory items:', error);
        return [];
    }

    return data.map((item: any) => {
        // Determine status dynamically
        let status: "OK" | "Low Stock" | "Out of Stock" = "OK";
        if (item.stock_quantity === 0) status = "Out of Stock";
        else if (item.stock_quantity <= item.min_stock_level) status = "Low Stock";

        return {
            id: item.id,
            category: item.category,
            name: item.name,
            stock: item.stock_quantity,
            minStock: item.min_stock_level,
            details: item.specs?.details || '',
            status: status
        };
    });
}
export async function getAssets(category: string) {
    // 1. Get all item IDs for this category first
    const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('id, name, category, specs')
        .eq('category', category);

    if (itemError || !itemData) {
        console.error(`Error fetching items for category ${category}:`, itemError);
        return [];
    }

    const itemIds = itemData.map(i => i.id);
    const itemMap = new Map(itemData.map(i => [i.id, i]));

    // 2. Fetch assets for these item IDs
    const zoneFilter = await getZoneFilter();
    let query = supabaseAdmin
        .from('assets')
        .select('*')
        .in('item_id', itemIds);

    if (zoneFilter) {
        query = query.eq('zone', zoneFilter);
    }

    const { data, error } = await query;

    if (error) {
        console.error(`Error fetching assets for category ${category}:`, error);
        return [];
    }

    return (data || []).map((asset: any) => {
        const item = itemMap.get(asset.item_id);

        // Try to guess color if missing from metadata
        let color = asset.metadata?.color || asset.metadata?.lamp_color;
        if (!color || color === 'null' || color === 'Onbekend') {
            const name = (item?.name || asset.name || '').toLowerCase();
            if (name.includes('rood') || name.includes(' red') || name.endsWith('r')) color = 'Rood';
            else if (name.includes('groen') || name.includes('green') || name.endsWith('g')) color = 'Groen';
            else if (name.includes('geel') || name.includes('yellow') || name.includes(' y')) color = 'Geel';
            else if (name.includes('zwart') || name.includes('black')) color = 'Zwart';
            else if (name.includes('blauw') || name.includes('blue')) color = 'Blauw/Geel';
        }

        return {
            id: asset.id,
            item_id: asset.item_id,
            name: item?.name || asset.name || 'Onbekend',
            category: item?.category || category,
            status: asset.status,
            location: asset.location || 'Opslag',
            deployment_id: asset.deployment_id,
            details: item?.specs?.details || '',
            specs: item?.specs || {},
            metadata: {
                ...asset.metadata,
                color: color || asset.metadata?.color || 'Onbekend'
            }
        };
    });
}

export async function getItemTypes(category: string) {
    const { data } = await supabase
        .from('items')
        .select('id, name, specs, category, min_stock_level')
        .eq('category', category)
        .order('name');

    const zoneFilter = await getZoneFilter();
    if (!zoneFilter || !data) return data || [];

    return data.filter((item: any) => {
        const itemZone = item.specs?.zone;
        return !itemZone || itemZone === zoneFilter;
    });
}

export async function getInventoryCounts() {
    const zoneFilter = await getZoneFilter();
    let query = supabaseAdmin
        .from('assets')
        .select(`
            item_id,
            status,
            items (
                category
            )
        `)
        .eq('status', 'in_stock');

    if (zoneFilter) {
        query = query.eq('zone', zoneFilter);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching inventory counts:', error);
        return {};
    }

    // Group by category
    const counts: Record<string, number> = {};

    data.forEach((asset: any) => {
        const category = asset.items?.category;
        if (category) {
            counts[category] = (counts[category] || 0) + 1;
        }
    });

    return counts;
}

import { BUOY_RECIPES } from './constants';

export async function getAssemblyPotential() {
    const zoneFilter = await getZoneFilter();
    let query = supabaseAdmin
        .from('assets')
        .select(`
            id,
            items!inner (
                name,
                category
            )
        `)
        .eq('status', 'in_stock');

    if (zoneFilter) {
        query = query.eq('zone', zoneFilter);
    }

    const { data: assets, error } = await query;

    if (error) {
        console.error('Error fetching assets for assembly potential:', error);
        return [];
    }

    // 2. Count stock per item name
    const stockCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    assets.forEach((a: any) => {
        const name = a.items.name;
        const cat = a.items.category;
        stockCounts[name] = (stockCounts[name] || 0) + 1;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // 3. Calculate potential for each recipe
    return Object.entries(BUOY_RECIPES).map(([model, recipe]) => {
        let maxPossible = Infinity;
        let bottlenecks: { name: string; category: string; required: number; available: number }[] = [];

        recipe.components.forEach(comp => {
            // Check by specific name only to prevent incorrect fallbacks
            // e.g. "JET 2000" structure (0 stock) shouldn't fall back to "Structuur" category count (5 stock)
            const available = stockCounts[comp.name] || 0;

            const possibleWithThis = Math.floor(available / comp.quantity);
            if (possibleWithThis < maxPossible) {
                maxPossible = possibleWithThis;
            }

            if (available < comp.quantity) {
                bottlenecks.push({
                    name: comp.name,
                    category: comp.category,
                    required: comp.quantity,
                    available: available
                });
            }
        });

        return {
            id: model, // The key e.g. "JET 9000 Rood"
            model: recipe.model || model,
            color: recipe.color,
            potential: maxPossible === Infinity ? 0 : maxPossible,
            bottlenecks,
            components: recipe.components.map(c => ({
                ...c,
                available: stockCounts[c.name] || 0
            }))
        };
    });
}

export async function deployBuoy(data: {
    location: { lat: number; lng: number };
    name: string;
    buoy_id: string; // The specific asset ID of the buoy
    components: {
        chain_id?: string;
        stone_id?: string;
        lamp_id?: string;
        topmark_id?: string;
    };
    notes?: string;
    light_character?: string;
    photo_url?: string;
    is_external_customer?: boolean;
    customer_name?: string;
}) {
    // 1. Prepare asset IDs to link
    const assetIds = [
        data.buoy_id,
        data.components.chain_id,
        data.components.stone_id,
        data.components.lamp_id,
        data.components.topmark_id
    ].filter(id => id !== undefined && id !== null) as string[];

    // 2. Fetch asset details for metadata
    const deploymentDate = new Date();
    const deploymentDateStr = deploymentDate.toISOString().split('T')[0];

    const componentMetadata: any = {
        buoy_asset_id: data.buoy_id,
        ...data.components,
        photo_url: data.photo_url,
        external_customer: data.is_external_customer || false,
        customer_name: data.customer_name || null,
        customer_deploy_date: data.is_external_customer ? deploymentDateStr : null
    };

    if (assetIds.length > 0) {
        const { data: assets } = await supabaseAdmin
            .from('assets')
            .select(`
                id,
                metadata,
                items (
                    name,
                    category
                )
            `)
            .in('id', assetIds);

        if (assets) {
            assets.forEach((asset: any) => {
                const category = asset.items?.category;
                const name = asset.items?.name || 'Onbekend';
                const meta = asset.metadata || {};

                // Map to specific domain objects in metadata
                if (asset.id === data.buoy_id) {
                    componentMetadata.model = name;

                    // Extract color from name if metadata is missing or generic 'geel'
                    let inferredColor = meta.color || meta.kleur;
                    const nameLower = name.toLowerCase();

                    if (!inferredColor || inferredColor.toLowerCase() === 'geel') {
                        if (nameLower.includes('blauw/geel')) inferredColor = 'Blauw/Geel';
                        else if (nameLower.includes('zwart/geel')) inferredColor = 'Zwart/Geel';
                        else if (nameLower.includes('rood')) inferredColor = 'Rood';
                        else if (nameLower.includes('groen')) inferredColor = 'Groen';
                        else if (nameLower.includes('blauw')) inferredColor = 'Blauw';
                        else if (nameLower.includes('zwart')) inferredColor = 'Zwart';
                    }

                    componentMetadata.color = inferredColor || 'geel';
                    componentMetadata.boei_soort = meta.boei_soort || meta.soort || 'standaard';

                    // Update boei_soort if it's still 'standaard' but we found a specific color/mark type
                    if (componentMetadata.boei_soort === 'standaard') {
                        const nl = nameLower;
                        const cl = (componentMetadata.color || "").toLowerCase();

                        if (nl.includes('wrak') || cl === 'blauw/geel') componentMetadata.boei_soort = 'wrak';
                        else if (nl.includes('spits') || cl === 'groen') componentMetadata.boei_soort = 'spits';
                        else if (nl.includes('plat') || cl === 'rood') componentMetadata.boei_soort = 'plat';
                        else if (nl.includes('noord')) componentMetadata.boei_soort = 'noord-cardinaal';
                        else if (nl.includes('zuid')) componentMetadata.boei_soort = 'zuid-cardinaal';
                        else if (nl.includes('oost')) componentMetadata.boei_soort = 'oost-cardinaal';
                        else if (nl.includes('west')) componentMetadata.boei_soort = 'west-cardinaal';
                    }
                } else if (asset.id === data.components.lamp_id) {
                    componentMetadata.light = {
                        ...meta,
                        type: name,
                        asset_id: asset.id
                    };
                } else if (asset.id === data.components.chain_id) {
                    componentMetadata.chain = {
                        ...meta,
                        type: name,
                        asset_id: asset.id
                    };
                } else if (asset.id === data.components.stone_id) {
                    componentMetadata.sinker = {
                        ...meta,
                        type: name,
                        asset_id: asset.id
                    };
                } else if (asset.id === data.components.topmark_id) {
                    componentMetadata.topmark = {
                        ...meta,
                        type: name,
                        asset_id: asset.id
                    };
                }
            });
        }
    }

    // 2.1 Try to find a matching configuration ID
    let buoyConfigId = null;
    if (componentMetadata.model) {
        const { data: config } = await supabaseAdmin
            .from('buoy_configurations')
            .select('id')
            .eq('name', componentMetadata.model)
            .maybeSingle();
        if (config) buoyConfigId = config.id;
    }

    // 3. Create Deployed Buoy Record
    const locationString = `(${data.location.lat},${data.location.lng})`;

    // Automatically set next service due date 6 months from now
    const nextServiceDate = new Date(deploymentDate);
    nextServiceDate.setMonth(nextServiceDate.getMonth() + 6);

    const activeZone = await getZoneFilter();

    const { data: deployedBuoy, error: createError } = await supabaseAdmin
        .from('deployed_buoys')
        .insert({
            name: data.name,
            location: locationString,
            notes: data.notes,
            deployment_date: deploymentDateStr,
            status: 'OK',
            buoy_config_id: buoyConfigId,
            metadata: componentMetadata,
            next_service_due: nextServiceDate.toISOString().split('T')[0],
            light_character: data.light_character,
            zone: activeZone
        })
        .select()
        .single();

    if (createError) {
        console.error('Error creating deployment:', createError);
        throw new Error('Failed to create deployment record');
    }

    // 4. Update Assets status and link to deployment
    if (assetIds.length > 0) {
        const { error: updateError } = await supabaseAdmin
            .from('assets')
            .update({
                status: 'deployed',
                location: `Boei ${data.name}`,
                deployment_id: deployedBuoy.id,
                zone: activeZone
            })
            .in('id', assetIds);

        if (updateError) {
            console.error('Error updating assets:', updateError);
            throw new Error('Failed to update assets status');
        }
    }

    return deployedBuoy;
}

export async function updateDeployedBuoy(id: string, updates: any) {
    const { error } = await supabaseAdmin
        .from('deployed_buoys')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error updating deployed buoy:', error);
        throw error;
    }
}

export async function retrieveBuoyWithDispositions(id: string, dispositions: Record<string, string>) {
    // 1. Get all assets currently linked to this deployment
    const { data: assets } = await supabaseAdmin
        .from('assets')
        .select('id')
        .eq('deployment_id', id);

    if (assets && assets.length > 0) {
        // 2. Update each asset with its specific disposition
        for (const asset of assets) {
            const targetStatus = dispositions[asset.id] || 'in_stock';
            let targetLocation = 'Magazijn';

            if (targetStatus === 'maintenance') targetLocation = 'Loods / Reparatie';
            else if (targetStatus === 'broken') targetLocation = 'Afgeschreven';

            await supabaseAdmin
                .from('assets')
                .update({
                    status: targetStatus,
                    location: targetLocation,
                    deployment_id: null
                })
                .eq('id', asset.id);
        }
    }

    // 3. Archive the deployment record instead of deleting
    const { data: buoy } = await supabaseAdmin.from('deployed_buoys').select('metadata').eq('id', id).single();
    
    // Use the manually entered pickup date if it exists, otherwise use today's date
    const existingPickupDate = buoy?.metadata?.customer_pickup_date || buoy?.metadata?.archived_date;
    const archiveDate = existingPickupDate ? existingPickupDate : new Date().toISOString().split('T')[0];

    const newMetadata = {
        ...(buoy?.metadata || {}),
        archived_date: archiveDate,
        customer_pickup_date: archiveDate // For backwards compatibility
    };

    const { error } = await supabaseAdmin
        .from('deployed_buoys')
        .update({
            status: 'Archived',
            metadata: newMetadata,
        })
        .eq('id', id);

    if (error) {
        console.error('Error archiving deployment during retrieval:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
// Items with stock info for min stock management & low stock
// ─────────────────────────────────────────────────────────────

export async function getItemsWithStockInfo(category?: string): Promise<{
    id: string;
    name: string;
    category: string;
    minStock: number;
    inStock: number;
    deployed: number;
    maintenance: number;
    specs: any;
    status: 'ok' | 'low' | 'out';
}[]> {
    // 1. Get all item types (optionally filtered by category)
    let query = supabase.from('items').select('id, name, category, min_stock_level, specs');
    if (category) query = query.eq('category', category);
    const { data: items, error: itemsError } = await query.order('category').order('name');
    if (itemsError || !items) return [];

    // 2. Get all assets that link to these item types
    const itemIds = items.map((i: any) => i.id);
    const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('item_id, status')
        .in('item_id', itemIds);

    if (assetsError) return [];

    // 3. Count per item_id
    const counts: Record<string, { inStock: number; deployed: number; maintenance: number }> = {};
    for (const asset of (assets || [])) {
        if (!counts[asset.item_id]) counts[asset.item_id] = { inStock: 0, deployed: 0, maintenance: 0 };
        if (asset.status === 'in_stock') counts[asset.item_id].inStock++;
        else if (asset.status === 'deployed') counts[asset.item_id].deployed++;
        else if (asset.status === 'maintenance') counts[asset.item_id].maintenance++;
    }

    // 4. Map result
    return items.map((item: any) => {
        const c = counts[item.id] || { inStock: 0, deployed: 0, maintenance: 0 };
        const minStock = item.min_stock_level ?? 0;
        let status: 'ok' | 'low' | 'out' = 'ok';
        if (c.inStock === 0 && minStock > 0) status = 'out';
        else if (c.inStock < minStock) status = 'low';
        return {
            id: item.id,
            name: item.name,
            category: item.category,
            minStock,
            inStock: c.inStock,
            deployed: c.deployed,
            maintenance: c.maintenance,
            specs: item.specs || {},
            status
        };
    });
}

export async function getAppSettings() {
    const { data, error } = await supabase
        .from('app_settings')
        .select('*');

    if (error) {
        console.error('Error fetching app settings:', error);
        return [];
    }

    return data;
}

export async function updateAppSetting(key: string, value: any) {
    const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) {
        console.error('Error updating app setting:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
// CUSTOMERS MANAGEMENT (Stored in app_settings)
// ─────────────────────────────────────────────────────────────

export interface Customer {
    id: string;
    name: string;
    notes?: string;
    contact?: string;
}

export async function getCustomers(): Promise<Customer[]> {
    const settings = await getAppSettings();
    const customerSetting = settings.find(s => s.key === 'customers');
    
    if (customerSetting && customerSetting.value) {
        let val = customerSetting.value;
        if (typeof val === 'string') {
            try {
                val = JSON.parse(val);
            } catch (e) {
                console.error("Failed to parse customers setting", e);
            }
        }
        if (val && Array.isArray(val.list)) {
            return val.list;
        }
    }
    return [];
}

export async function updateCustomer(customer: Customer) {
    const customers = await getCustomers();
    const idx = customers.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
        customers[idx] = customer;
    } else {
        customers.push(customer);
    }
    await updateAppSetting('customers', { list: customers });
}

export async function deleteCustomer(id: string) {
    const customers = await getCustomers();
    const newCustomers = customers.filter(c => c.id !== id);
    await updateAppSetting('customers', { list: newCustomers });
}
