import { supabaseAdmin } from '@/lib/supabaseAdmin';
import * as xlsx from 'xlsx';

export async function generateBackupExcel(): Promise<Buffer> {
    // 1. Fetch data
    const [assetsRes, buoysRes, logsRes, itemsRes, configRes] = await Promise.all([
        supabaseAdmin.from('assets').select(`
            *,
            items (name, category, specs)
        `),
        supabaseAdmin.from('deployed_buoys').select('*'),
        supabaseAdmin.from('maintenance_logs').select('*').order('service_date', { ascending: false }),
        supabaseAdmin.from('items').select('*').order('category').order('name'),
        supabaseAdmin.from('buoy_configurations').select('*').order('name')
    ]);

    if (assetsRes.error) throw new Error(`Assets error: ${assetsRes.error.message}`);
    if (buoysRes.error) throw new Error(`Buoys error: ${buoysRes.error.message}`);
    if (logsRes.error) throw new Error(`Logs error: ${logsRes.error.message}`);
    if (itemsRes.error) throw new Error(`Items error: ${itemsRes.error.message}`);
    if (configRes.error) throw new Error(`Config error: ${configRes.error.message}`);

    // Helper to flatten metadata
    const flattenMetadata = (item: any, prefix: string = '') => {
        const flattened: any = {};
        if (item.metadata && typeof item.metadata === 'object') {
            Object.entries(item.metadata).forEach(([key, value]) => {
                flattened[`${prefix}${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
            });
        }
        return flattened;
    };

    // 2. Format Data
    const formattedAssets = assetsRes.data.map((a: any) => ({
        ID: a.id,
        Naam: a.items?.name || 'Onbekend',
        Categorie: a.items?.category || '-',
        Status: a.status,
        Locatie: a.location || '-',
        Zone: a.zone || '-',
        ...flattenMetadata(a)
    }));

    const formattedBuoys = buoysRes.data.map((b: any) => {
        // Find linked assets for this buoy
        const linkedAssets = assetsRes.data.filter(a => a.deployment_id === b.id);
        const lamp = linkedAssets.find(a => a.items?.category === 'Lamp');
        const chain = linkedAssets.find(a => a.items?.category === 'Ketting');
        const stone = linkedAssets.find(a => a.items?.category === 'Steen');

        return {
            ID: b.id,
            Naam: b.name,
            Status: b.status,
            Locatie_Lat: b.location?.lat || '-',
            Locatie_Lng: b.location?.lng || '-',
            Uitgelegd_Op: b.deployment_date ? new Date(b.deployment_date).toLocaleDateString('nl-BE') : '-',
            Laatste_Onderhoud: b.last_service_date ? new Date(b.last_service_date).toLocaleDateString('nl-BE') : '-',
            Volgend_Onderhoud: b.next_service_due ? new Date(b.next_service_due).toLocaleDateString('nl-BE') : '-',
            Licht_Karakter: b.light_character || '-',
            Zone: b.zone || '-',
            // Linked Components
            Lamp_Type: lamp?.items?.name || '-',
            Lamp_Serienummer: lamp?.metadata?.serial_number || lamp?.metadata?.serialNumber || '-',
            Ketting_Type: chain?.items?.name || '-',
            Ketting_Lengte: chain?.metadata?.length || '-',
            Steen_Type: stone?.items?.name || '-',
            Steen_Gewicht: stone?.metadata?.weight || '-',
            ...flattenMetadata(b)
        };
    });

    const formattedLogs = logsRes.data.map((l: any) => {
        const buoy = buoysRes.data.find(b => b.id === l.buoy_id);
        return {
            ID: l.id,
            Boei_Naam: buoy?.name || l.buoy_id,
            Service_Datum: l.service_date ? new Date(l.service_date).toLocaleDateString('nl-BE') : '-',
            Uitvoerder: l.technician || '-',
            Omschrijving: l.description || l.notes || '-',
            ...flattenMetadata(l)
        };
    });

    const formattedCatalog = itemsRes.data.map((i: any) => ({
        ID: i.id,
        Naam: i.name,
        Categorie: i.category,
        Minimum_Voorraad: i.min_stock_level,
        Specificaties: JSON.stringify(i.specs || {})
    }));

    const formattedConfigs = configRes.data.map((c: any) => ({
        ID: c.id,
        Naam: c.name,
        ...flattenMetadata(c)
    }));

    // 3. Create Workbook
    const wb = xlsx.utils.book_new();

    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(formattedBuoys), "Uitgelegde_Boeien");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(formattedAssets), "Voorraad_Assets");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(formattedLogs), "Onderhoudshistoriek");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(formattedCatalog), "Catalogus_Items");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(formattedConfigs), "Configuraties");

    // 4. Generate & Return Buffer
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
