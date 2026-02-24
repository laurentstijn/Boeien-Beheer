export const dynamic = 'force-dynamic';
import { StenenManagement } from "@/components/StenenManagement";
import { getAssets, getItemTypes, getDeployedBuoys } from "@/lib/db";

export default async function StenenPage() {
    const assets = await getAssets("Steen");
    const itemTypes = await getItemTypes("Steen");
    const buoys = await getDeployedBuoys();

    return (
        <div className="space-y-8">
            <StenenManagement
                title="Stenen & Verzwaring"
                category="Steen"
                assets={assets}
                itemTypes={itemTypes}
                buoys={buoys}
            />
        </div>
    );
}
