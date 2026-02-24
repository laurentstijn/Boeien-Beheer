export const dynamic = 'force-dynamic';
import { StockManagement } from "@/components/StockManagement";
import { getAssets, getItemTypes, getDeployedBuoys } from "@/lib/db";

import { AddAssetButton } from "@/components/AddBuoyButton";

export default async function ToptekensPage() {
    const assets = await getAssets("Topteken");
    const types = await getItemTypes("Topteken");
    const buoys = await getDeployedBuoys();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-app-text-primary">Toptekens / Accessoires</h1>
                <AddAssetButton itemTypes={types} category="Topteken" label="Nieuw Topteken" buoys={buoys} />
            </div>
            <StockManagement
                title="Toptekens Voorraad"
                assets={assets}
                category="Topteken"
                itemTypes={types}
                showColor={false}
                buoys={buoys}
            />
        </div>
    );
}
