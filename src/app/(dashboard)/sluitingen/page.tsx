export const dynamic = 'force-dynamic';
import { StockManagement } from "@/components/StockManagement";
import { getAssets, getItemTypes, getDeployedBuoys } from "@/lib/db";

import { AddAssetButton } from "@/components/AddBuoyButton";

export default async function SluitingenPage() {
    const assets = await getAssets("Sluiting");
    const types = await getItemTypes("Sluiting");
    const buoys = await getDeployedBuoys();
    console.log("SluitingenPage Debug:", { assetsLength: assets.length, typesLength: types.length });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-app-text-primary">Sluitingen</h1>
                <AddAssetButton itemTypes={types} category="Sluiting" label="Nieuwe Sluiting" buoys={buoys} />
            </div>
            <StockManagement
                title="Sluitingen Voorraad"
                assets={assets}
                category="Sluiting"
                itemTypes={types}
                showColor={false}
                buoys={buoys}
            />
        </div>
    );
}
