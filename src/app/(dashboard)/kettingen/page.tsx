export const dynamic = 'force-dynamic';
import { ChainManagement } from "@/components/ChainManagement";
import { getAssets, getItemTypes, getDeployedBuoys } from "@/lib/db";

export default async function KettingenPage() {
    const assets = await getAssets("Ketting");
    const types = await getItemTypes("Ketting");
    const buoys = await getDeployedBuoys();

    return (
        <div className="space-y-8">
            <ChainManagement
                title="Ketting Voorraad"
                assets={assets}
                itemTypes={types}
                buoys={buoys}
            />
        </div>
    );
}
