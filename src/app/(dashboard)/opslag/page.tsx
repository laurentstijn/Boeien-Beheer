export const dynamic = 'force-dynamic';
import { AssetTable } from "@/components/AssetTable";
import { getAssets } from "@/lib/db";

export default async function OpslagPage() {
    const assets = await getAssets("Opslag");
    return <AssetTable assets={assets} title="Opslag (Individueel)" />;
}
