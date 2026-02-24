import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const updates = await request.json();

        console.log(`Updating buoy ${id} with:`, updates);

        const { error } = await supabaseAdmin
            .from('deployed_buoys')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Supabase update error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        // If the name of the buoy was updated, sync the location of all attached assets in the inventory
        if (updates.name) {
            const { error: assetUpdateError } = await supabaseAdmin
                .from('assets')
                .update({ location: `Boei ${updates.name}` })
                .eq('deployment_id', id);

            if (assetUpdateError) {
                console.warn('Failed to sync asset locations after buoy rename:', assetUpdateError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Clear deployment_id from assets
        await supabaseAdmin
            .from('assets')
            .update({ status: 'in_stock', location: 'Opslag', deployment_id: null })
            .eq('deployment_id', id);

        // 2. Delete the deployment record
        const { error } = await supabaseAdmin
            .from('deployed_buoys')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase delete error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
