export const dynamic = 'force-dynamic';
import { AssetTable } from "@/components/AssetTable";
import { getAssets, getItemTypes } from "@/lib/db";

export default async function ContragewichtenPage() {
    const assets = await getAssets("Contragewicht");
    const itemTypes = await getItemTypes("Contragewicht");

    return <AssetTable assets={assets} title="Contragewichten" types={itemTypes} />;
}
