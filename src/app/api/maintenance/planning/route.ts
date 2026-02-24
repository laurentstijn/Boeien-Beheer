import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('planning_entries')
            .select(`
                *,
                buoy:deployed_buoys (
                    id,
                    name,
                    status,
                    buoy_configurations (
                        name
                    )
                )
            `)
            .gte('planned_date', new Date().toISOString().split('T')[0])
            .order('planned_date', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
