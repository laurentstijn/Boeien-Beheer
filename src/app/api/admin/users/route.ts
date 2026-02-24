import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;

        return NextResponse.json(users);
    } catch (e: any) {
        console.error('Error fetching users:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
