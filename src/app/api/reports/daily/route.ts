import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getZoneFilter } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    if (!dateParam) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    try {
        const zoneFilter = await getZoneFilter();

        let query = supabaseAdmin
            .from('maintenance_logs')
            .select(`
                *,
                deployed_buoys!maintenance_logs_deployed_buoy_id_fkey!inner (
                    id,
                    name,
                    zone,
                    metadata,
                    buoy_configurations (
                        name,
                        metadata
                    )
                )
            `)
            .gte('service_date', `${dateParam}T00:00:00`)
            .lte('service_date', `${dateParam}T23:59:59`)
            .order('service_date', { ascending: false });

        if (zoneFilter) {
            query = query.eq('deployed_buoys.zone', zoneFilter);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching daily report:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('Error in daily report API:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
