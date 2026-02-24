import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Attempt to select from the table
        const { data, error: selectError } = await supabase
            .from('maintenance_logs')
            .select('*')
            .limit(1);

        // Attempt INSERT
        // Using the ID we found earlier: 82d7a0df-54ec-4e0d-8868-76bd15dcc376
        const { error: insertError } = await supabase
            .from('maintenance_logs')
            .insert({
                buoy_id: '82d7a0df-54ec-4e0d-8868-76bd15dcc376',
                notes: 'Debug Insert',
                technician: 'Debugger test'
            });

        return NextResponse.json({
            success: !selectError && !insertError,
            selectError: selectError ? { message: selectError.message, code: selectError.code, details: selectError.details } : null,
            insertError: insertError ? { message: insertError.message, code: insertError.code, details: insertError.details } : null
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
