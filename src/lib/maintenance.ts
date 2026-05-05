import { supabaseAdmin as supabase } from './supabaseAdmin';

export async function recalculateBuoyMaintenance(buoyId: string) {
    // 1. Fetch ALL logs for this buoy to find both the absolute latest and the latest 'OK' log
    const { data: allLogs } = await supabase
        .from('maintenance_logs')
        .select('service_date, metadata')
        .eq('deployed_buoy_id', buoyId)
        .order('service_date', { ascending: false });

    if (!allLogs || allLogs.length === 0) {
        // Handle no logs cases (clear dates/status)
        await supabase.from('deployed_buoys').update({
            last_service_date: null,
            next_service_due: null,
            status: 'OK'
        }).eq('id', buoyId);
        return null;
    }

    const latestLog = allLogs[0];
    const latestMetadata = latestLog.metadata || {};
    const actualLastDate = latestLog.service_date;

    // 2. Fetch current buoy to merge metadata and get interval configuration
    const { data: buoy } = await supabase
        .from('deployed_buoys')
        .select('metadata')
        .eq('id', buoyId)
        .single();

    // We calculate the next_service_due directly from the absolute latest log, regardless of status.
    let next_service_due = null;
    if (latestLog && latestLog.service_date) {
        const d = new Date(latestLog.service_date);
        const intervalWeeks = latestMetadata.maintenance_interval_weeks || buoy?.metadata?.maintenance_interval_weeks || 45;
        d.setDate(d.getDate() + (intervalWeeks * 7));
        next_service_due = d.toISOString().split('T')[0];
    }

    const mergedMetadata = {
        ...(buoy?.metadata || {}),
        tide_restriction: latestMetadata.tide_restriction || buoy?.metadata?.tide_restriction,
        light_character: latestMetadata.light_character || buoy?.metadata?.light_character,
        status: latestMetadata.status || 'OK'
    };

    const { data: updatedData, error: updateError } = await supabase
        .from('deployed_buoys')
        .update({
            last_service_date: actualLastDate,
            next_service_due: next_service_due,
            status: latestMetadata.status || 'OK',
            tide_restriction: latestMetadata.tide_restriction || 'Altijd',
            light_character: latestMetadata.light_character || '',
            metadata: mergedMetadata
        })
        .eq('id', buoyId)
        .select(`
            *,
            buoy_configurations (
                name
            )
        `)
        .single();

    if (updateError) throw updateError;

    // Helper to parse Postgres point (lat,lng) string
    const parseLocation = (loc: any) => {
        if (typeof loc === 'string') {
            const parts = loc.replace(/[()]/g, '').split(',');
            if (parts.length === 2) {
                return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
            }
        }
        if (typeof loc === 'object' && loc !== null) {
            return { lat: loc.lat || loc.x || 0, lng: loc.lng || loc.y || 0 };
        }
        return { lat: 0, lng: 0 };
    };

    // Map to expected frontend structure (CamelCase)
    const updatedBuoy: any = {
        ...updatedData,
        location: parseLocation(updatedData.location),
        buoyType: {
            name: updatedData.buoy_configurations?.name || 'Onbekend',
            color: (updatedData.metadata?.color || 'yellow').toLowerCase()
        },
        lastServiceDate: updatedData.last_service_date,
        nextServiceDue: updatedData.next_service_due,
        tideRestriction: updatedData.tide_restriction,
        lightCharacter: updatedData.light_character
    };

    // Ensure components exist for frontend safety
    updatedBuoy.chain = updatedBuoy.metadata?.chain || { type: 'Zwart', length: '', thickness: '' };
    updatedBuoy.sinker = updatedBuoy.metadata?.sinker || { weight: '', type: '' };
    updatedBuoy.light = updatedBuoy.metadata?.light || { serialNumber: '', type: '' };
    if (updatedBuoy.metadata?.buoy) {
        updatedBuoy.buoyType.name = updatedBuoy.metadata.buoy.type;
        updatedBuoy.buoyType.color = (updatedBuoy.metadata.buoy.color || 'yellow').toLowerCase();
    }

    return updatedBuoy;
}
