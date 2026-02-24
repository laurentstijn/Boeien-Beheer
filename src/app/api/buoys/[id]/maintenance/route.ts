import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '0', 10);
        const limit = parseInt(searchParams.get('limit') || '5', 10);

        const from = page * limit;
        const to = from + limit - 1;

        if (!id || id === 'undefined') {
            return NextResponse.json({ data: [], count: 0 });
        }

        const { data, count, error } = await supabase
            .from('maintenance_logs')
            .select('*', { count: 'exact' })
            .eq('deployed_buoy_id', id)
            .order('service_date', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching maintenance logs:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data, count });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
