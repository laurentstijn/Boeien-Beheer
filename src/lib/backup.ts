import { supabase } from '@/lib/supabase';
import * as xlsx from 'xlsx';

export async function generateBackupExcel(): Promise<Buffer> {
    // 1. Fetch data
    const [assetsRes, buoysRes, logsRes] = await Promise.all([
        supabase.from('assets').select(`
            id, item_id, status, location, price, order_number, delivery_date, deployment_id,
            items (name, specs, type)
        `),
        supabase.from('deployed_buoys').select('*'),
        supabase.from('maintenance_logs').select('*').order('service_date', { ascending: false })
    ]);

    if (assetsRes.error) throw new Error(`Assets error: ${assetsRes.error.message}`);
    if (buoysRes.error) throw new Error(`Buoys error: ${buoysRes.error.message}`);
    if (logsRes.error) throw new Error(`Logs error: ${logsRes.error.message}`);

    // 2. Format Data
    const formattedAssets = assetsRes.data.map((a: any) => ({
        ID: a.id,
        Naam: a.items?.name || 'Onbekend',
        Type: a.items?.type || '-',
        Status: a.status,
        Locatie: a.location || '-',
        Aankoopprijs: a.price || '-',
        Bestelnummer: a.order_number || '-',
        Leverdatum: a.delivery_date ? new Date(a.delivery_date).toLocaleDateString('nl-BE') : '-',
        Gekoppeld_Aan_Boei: a.deployment_id || '-'
    }));

    const formattedBuoys = buoysRes.data.map((b: any) => ({
        ID: b.id,
        Naam: b.name,
        Status: b.status,
        Locatie_Lat: b.location?.lat || '-',
        Locatie_Lng: b.location?.lng || '-',
        Uitgelegd_Op: b.deployment_date ? new Date(b.deployment_date).toLocaleDateString('nl-BE') : '-',
        Laatste_Onderhoud: b.last_service_date ? new Date(b.last_service_date).toLocaleDateString('nl-BE') : '-',
        Volgend_Onderhoud: b.next_service_due ? new Date(b.next_service_due).toLocaleDateString('nl-BE') : '-',
        Licht_Karakter: b.light_character || '-',
        Klant: b.metadata?.customer_name || '-',
        Kleur: b.metadata?.color || '-',
        Vorm: b.metadata?.model || '-'
    }));

    const formattedLogs = logsRes.data.map((l: any) => ({
        ID: l.id,
        Boei_ID: l.buoy_id,
        Service_Datum: l.service_date ? new Date(l.service_date).toLocaleDateString('nl-BE') : '-',
        Uitvoerder: l.technician || '-',
        Omschrijving: l.description || l.notes || '-',
        Nieuwe_Ketting: l.metadata?.replacement_names?.chain || '-',
        Nieuwe_Lamp: l.metadata?.replacement_names?.light || '-',
        Nieuwe_Steen: l.metadata?.replacement_names?.sinker || '-',
        Boei_Gereinigd: l.metadata?.buoy_cleaned ? 'Ja' : 'Nee',
        Status_Na_Service: l.metadata?.status || 'OK'
    }));

    // 3. Create Workbook
    const wb = xlsx.utils.book_new();

    const wsBuoys = xlsx.utils.json_to_sheet(formattedBuoys);
    xlsx.utils.book_append_sheet(wb, wsBuoys, "Boeien");

    const wsAssets = xlsx.utils.json_to_sheet(formattedAssets);
    xlsx.utils.book_append_sheet(wb, wsAssets, "Voorraad_Assets");

    const wsLogs = xlsx.utils.json_to_sheet(formattedLogs);
    xlsx.utils.book_append_sheet(wb, wsLogs, "Onderhoudshistoriek");

    // 4. Generate & Return Buffer
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
