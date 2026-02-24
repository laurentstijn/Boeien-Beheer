import { getAssets } from "@/lib/db";

export async function GET() {
    try {
        const chainAssets = await getAssets("Ketting");

        // Return chains with relevant info for dropdown
        const chains = chainAssets.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            details: asset.details || asset.specs?.details || '',
            location: asset.location
        }));

        return Response.json({ chains });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
