import { getAssets } from "@/lib/db";

export async function GET() {
    try {
        const chainAssets = await getAssets("Ketting");

        // Debug: check first few assets
        const sample = chainAssets.slice(0, 5).map((asset: any) => ({
            name: asset.name,
            specs_color: asset.specs?.color,
            metadata_color: asset.metadata?.color,
            specs: asset.specs,
            metadata: asset.metadata
        }));

        return Response.json({
            total: chainAssets.length,
            blauwTotal: chainAssets.filter((a: any) => a.name === "Ketting Blauw").length,
            blauwWithSwivel: chainAssets.filter((a: any) => a.name === "Ketting Blauw" && a.metadata?.swivel === "Ja").length,
            blauwWithoutSwivel: chainAssets.filter((a: any) => a.name === "Ketting Blauw" && (a.metadata?.swivel === "Nee" || !a.metadata?.swivel)).length,
            sample,
            allColors: chainAssets.map((a: any) => a.name)
        });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
