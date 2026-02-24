import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: assets, error } = await supabase.from('assets').select(`
            id,
            status,
            location,
            metadata,
            items (
                name,
                category,
                specs
            )
        `);

        if (error) throw error;

        // Flatten for easier filtering
        const flatAssets = assets.map((a: any) => ({
            ...a,
            name: a.items?.name || 'Unknown',
            category: a.items?.category || 'Unknown'
        }));

        // Use flatAssets for filtering below...
        const assetsToUse = flatAssets;

        // Distribution Logic (Mirrors page.tsx)
        const jet9000Assets = assetsToUse.filter((a: any) => a.metadata?.model === 'JET 9000' || a.name.includes('JET 9000'));
        const jet2000Assets = assetsToUse.filter((a: any) => a.metadata?.model === 'JET 2000' || a.name.includes('JET 2000'));

        const mobilisBCAssets = assetsToUse.filter((a: any) => a.name.includes('BC1241') || a.metadata?.model?.includes('BC1241'));
        const mobilisAQAssets = assetsToUse.filter((a: any) => a.name.includes('AQ1500') || a.metadata?.model?.includes('AQ1500'));

        const jfcMarineAssets = assetsToUse.filter((a: any) => a.name.includes('JFC') || a.metadata?.model?.includes('JFC'));
        const sealiteAssets = assetsToUse.filter((a: any) => a.name.includes('SEALITE') || a.metadata?.model?.includes('SEALITE') || a.name.includes('SLB 1500'));

        const otherAssets = assetsToUse.filter((a: any) =>
            !jet9000Assets.find(x => x.id === a.id) &&
            !jet2000Assets.find(x => x.id === a.id) &&
            !mobilisBCAssets.find(x => x.id === a.id) &&
            !mobilisAQAssets.find(x => x.id === a.id) &&
            !jfcMarineAssets.find(x => x.id === a.id) &&
            !sealiteAssets.find(x => x.id === a.id)
        );

        const summary = {
            total_db: assets.length,
            breakdown: {
                jet9000: jet9000Assets.length,
                jet2000: jet2000Assets.length,
                mobilis_bc: mobilisBCAssets.length,
                mobilis_aq: mobilisAQAssets.length,
                jfc: jfcMarineAssets.length,
                sealite: sealiteAssets.length,
                other: otherAssets.length,
            },
            sum_of_parts: jet9000Assets.length + jet2000Assets.length + mobilisBCAssets.length + mobilisAQAssets.length + jfcMarineAssets.length + sealiteAssets.length + otherAssets.length,
            status_breakdown: {
                in_stock: assets.filter((a: any) => a.status === 'in_stock').length,
                deployed: assets.filter((a: any) => a.status === 'deployed').length,
                maintenance: assets.filter((a: any) => a.status === 'maintenance').length,
            }
        };

        return NextResponse.json(summary);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
