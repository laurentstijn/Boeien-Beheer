export const dynamic = 'force-dynamic';
import { AssetTable } from "@/components/AssetTable";
import { getAssets, getItemTypes } from "@/lib/db";

export default async function TorensPage() {
    const assets = await getAssets("Toren");
    const itemTypes = await getItemTypes("Toren");

    return <AssetTable assets={assets} title="Torens" types={itemTypes} />;
}
