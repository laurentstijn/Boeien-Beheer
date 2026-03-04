import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/inventory/available?category=Lamp
 * Returns individual assets in-stock for the given category,
 * with serial number from metadata so the user can pick a specific item.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeAssetId = searchParams.get('includeAssetId');

    if (!category) {
        return NextResponse.json({ error: 'Category required' }, { status: 400 });
    }

    try {
        let query = supabaseAdmin
            .from('assets')
            .select(`
                id,
                status,
                location,
                metadata,
                items (
                    id,
                    name,
                    category
                )
            `);

        if (includeAssetId) {
            query = query.or(`status.eq.in_stock,id.eq.${includeAssetId}`);
        } else {
            query = query.eq('status', 'in_stock');
        }

        const { data: assets, error } = await query.order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching assets:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Filter by category
        const inCategory = (assets || []).filter((a: any) => a.items?.category === category);

        // Track how many of each type we've seen (to number duplicates)
        const typeCounts: Record<string, number> = {};

        const filtered = inCategory.map((a: any) => {
            const meta = a.metadata || {};
            const serial = meta.serialNumber || meta.serial_number || meta.serial || meta.code || meta.sn || '';
            const name = a.items?.name || 'Onbekend';

            // Build a readable label
            let label: string;
            if (serial) {
                label = `SN: ${serial} — ${name}`;
            } else {
                // Number duplicates: "Carmanah M650 #1", "Carmanah M650 #2"
                typeCounts[name] = (typeCounts[name] || 0) + 1;
                label = `${name} #${typeCounts[name]}`;
            }

            const COLORS = ['rood', 'geel', 'groen', 'wit', 'blauw'];
            const colorFromName = COLORS.find(c => name.toLowerCase().includes(c));
            const color = meta.color || meta.lamp_color ||
                (colorFromName ? colorFromName.charAt(0).toUpperCase() + colorFromName.slice(1) : '');

            return {
                id: a.id,
                name: label,
                baseName: name,
                serial,
                color,
            };
        });

        return NextResponse.json(filtered);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
