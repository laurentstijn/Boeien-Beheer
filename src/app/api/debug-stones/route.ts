import { getAssets } from "@/lib/db";

export async function GET() {
    try {
        const stoneAssets = await getAssets("Steen");

        // Debug: check first few assets
        return Response.json({
            total: stoneAssets.length,
            stones: stoneAssets.map((asset: any) => ({
                id: asset.id,
                name: asset.name,
                metadata: asset.metadata
            })),
            uniqueNames: [...new Set(stoneAssets.map((a: any) => a.name))]
        });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
