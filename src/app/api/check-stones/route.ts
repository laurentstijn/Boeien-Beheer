import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        // Fetch all stone assets
        const { data: assets, error } = await supabase
            .from('assets')
            .select(`
                id,
                status,
                location,
                metadata,
                items!inner (
                    name,
                    category,
                    specs
                )
            `)
            .eq('items.category', 'Steen');

        if (error) {
            return Response.json({ error: error.message }, { status: 500 });
        }

        // Group by weight and shape
        const grouped: Record<string, any[]> = {};

        assets?.forEach(asset => {
            const weight = asset.metadata?.weight || 'unknown';
            const shape = asset.metadata?.shape || 'unknown';
            const key = `${weight}_${shape}`;

            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(asset);
        });

        // Create summary
        const summary = Object.entries(grouped).map(([key, items]) => ({
            key,
            weight: items[0]?.metadata?.weight,
            shape: items[0]?.metadata?.shape,
            count: items.length,
            items: items.map(i => ({
                id: i.id,
                status: i.status,
                metadata: i.metadata
            }))
        }));

        return Response.json({
            total: assets?.length || 0,
            summary,
            allAssets: assets
        });

    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
