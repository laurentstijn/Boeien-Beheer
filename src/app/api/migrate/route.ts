import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    try {
        const queries = [
            `ALTER TABLE deployed_buoys ADD COLUMN IF NOT EXISTS tide_restriction text DEFAULT 'Altijd';`,
            `ALTER TABLE deployed_buoys ADD COLUMN IF NOT EXISTS last_service_date date;`,
            `ALTER TABLE deployed_buoys ADD COLUMN IF NOT EXISTS next_service_due date;`,
            `CREATE TABLE IF NOT EXISTS maintenance_logs (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
                buoy_id uuid REFERENCES deployed_buoys(id) ON DELETE CASCADE,
                service_date date DEFAULT CURRENT_DATE,
                technician text,
                notes text,
                replaced_assets jsonb DEFAULT '[]'::jsonb,
                metadata jsonb DEFAULT '{}'::jsonb
            );`
        ];

        for (const sql of queries) {
            const { error } = await supabase.rpc('run_sql', { sql_query: sql });
            if (error) return NextResponse.json({ success: false, error: error.message, query: sql });
        }

        return NextResponse.json({ success: true, message: 'Maintenance schema updated successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
