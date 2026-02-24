export const dynamic = 'force-dynamic';
import { StockManagement } from "@/components/StockManagement";
import { getAssets, getItemTypes, getDeployedBuoys } from "@/lib/db";

import { AddAssetButton } from "@/components/AddBuoyButton";

export default async function ZinkblokkenPage() {
    const assets = await getAssets("Zinkblok");
    const itemTypes = await getItemTypes("Zinkblok");
    const buoys = await getDeployedBuoys();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-app-text-primary">Zinkblokken</h1>
                <AddAssetButton itemTypes={itemTypes} category="Zinkblok" label="Nieuw Zinkblok" buoys={buoys} />
            </div>
            <StockManagement
                title="Zinkblokken Voorraad"
                assets={assets}
                category="Zinkblok"
                itemTypes={itemTypes}
                showColor={false}
                buoys={buoys}
            />
        </div>
    );
}
