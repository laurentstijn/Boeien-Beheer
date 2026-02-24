export const dynamic = 'force-dynamic';
import { LampInventory } from "@/components/LampInventory";
import { getAssets, getItemTypes, getDeployedBuoys } from "@/lib/db";

export default async function LampenPage() {
    const assets = await getAssets("Lamp");
    const itemTypes = await getItemTypes("Lamp");
    const buoys = await getDeployedBuoys();

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-app-text-primary">Lamps Inventory</h1>
            </div>
            <LampInventory assets={assets} itemTypes={itemTypes} buoys={buoys} />
        </div>
    );
}
