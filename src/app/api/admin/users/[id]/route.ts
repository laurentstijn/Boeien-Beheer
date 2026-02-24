import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const { id } = params;
        const body = await request.json();
        const { role, zone } = body;

        const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: { role, zone }
        });

        if (error) throw error;
        return NextResponse.json({ success: true, user });
    } catch (e: any) {
        console.error('Error updating user:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const { id } = params;

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Error deleting user:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
