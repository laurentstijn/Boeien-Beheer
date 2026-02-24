import { NextResponse } from 'next/server';
import { getDeployedBuoys } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        console.log('Test DB route called');
        const buoys = await getDeployedBuoys();
        return NextResponse.json({ success: true, count: buoys.length, data: buoys });
    } catch (error) {
        console.error('Test DB failed:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
