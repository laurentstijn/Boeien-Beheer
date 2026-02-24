import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        console.log('Fetching database info...');

        const { data: buoySample } = await supabase.from('deployed_buoys').select('*').limit(1);
        const { data: logSample } = await supabase.from('maintenance_logs').select('*').limit(1);

        const buoyCols = buoySample && buoySample[0] ? Object.keys(buoySample[0]) : [];
        const logCols = logSample && logSample[0] ? Object.keys(logSample[0]) : [];

        return NextResponse.json({
            current_columns: {
                deployed_buoys: buoyCols,
                maintenance_logs: logCols
            },
            instruction: "If 'next_service_due' or 'buoy_id' is missing, run the SQL in Supabase.",
            sql_to_run: `
-- RUN THIS IN SUPABASE SQL EDITOR
ALTER TABLE deployed_buoys ADD COLUMN IF NOT EXISTS last_service_date date;
ALTER TABLE deployed_buoys ADD COLUMN IF NOT EXISTS next_service_due date;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS buoy_id uuid REFERENCES deployed_buoys(id) ON DELETE CASCADE;
            `
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
