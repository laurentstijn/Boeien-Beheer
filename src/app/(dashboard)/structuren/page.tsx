export const dynamic = 'force-dynamic';
import { AssetTable } from "@/components/AssetTable";
import { StockManagement } from "@/components/StockManagement";
import { AssemblySummary } from "@/components/AssemblySummary";
import { StructureInventorySummary } from "@/components/StructureInventorySummary";
import { getAssets, getItemTypes, getAssemblyPotential, getDeployedBuoys } from "@/lib/db";

export default async function StructurenPage() {
    const assets = await getAssets("Structuur");
    const itemTypes = await getItemTypes("Structuur");
    const buoys = await getDeployedBuoys();
    const assemblyPotentials = await getAssemblyPotential();

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AssemblySummary potentials={assemblyPotentials} />
                </div>
                <div>
                    <StructureInventorySummary assets={assets} />
                </div>
            </div>

            <StockManagement
                title="Structuren Voorraad"
                assets={assets}
                category="Structuur"
                itemTypes={itemTypes}
                showColor={false}
                buoys={buoys}
            />
        </div>
    );
}
