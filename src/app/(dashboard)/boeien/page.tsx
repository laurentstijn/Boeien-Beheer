export const dynamic = 'force-dynamic';
import { BuoySummary } from "@/components/BuoySummary";
import { StockManagement } from "@/components/StockManagement";
import { AddBuoyButton } from "@/components/AddBuoyButton";
import { AssemblySummary } from "@/components/AssemblySummary";
import { StructureInventorySummary } from "@/components/StructureInventorySummary";
import { getAssets, getItemTypes, getAssemblyPotential, getDeployedBuoys } from "@/lib/db";
import { inventoryItems } from "@/lib/data";

export default async function BoeienPage() {
    const buoyAssets = await getAssets("Boei");
    const buoyTypes = await getItemTypes("Boei");
    const structuurAssets = await getAssets("Structuur");
    const structuurTypes = await getItemTypes("Structuur");
    const assemblyPotentials = await getAssemblyPotential();
    const buoys = await getDeployedBuoys();
    // Combined lists for filtering
    const assets = [...buoyAssets, ...structuurAssets];

    // Filter out structure types that already exist as buoy types to prevent duplicates (e.g. JET 9000)
    const uniqueStructuurTypes = structuurTypes.filter((st: any) => !buoyTypes.some((bt: any) => bt.name === st.name));
    const itemTypes = [...buoyTypes, ...uniqueStructuurTypes];

    // --- Helper to check if item is a structure/reserve ---
    const isStructure = (item: any) => {
        return item.category === 'Structuur' || item.name.toLowerCase().includes('reserve') || item.name.toLowerCase().includes('lichaam');
    }

    // Filter by specific models for the new stock view
    // We filter from 'assets' (combined) so that structures/reserves are INCLUDED in the main cards.
    const jet9000Assets = assets.filter((a: any) => a.metadata?.model === 'JET 9000' || a.name.includes('JET 9000'));
    const jet2000Assets = assets.filter((a: any) => a.metadata?.model === 'JET 2000' || a.name.includes('JET 2000'));

    const mobilisBCAssets = assets.filter((a: any) => a.name.includes('BC1241') || a.metadata?.model?.includes('BC1241'));
    const mobilisAQAssets = assets.filter((a: any) => a.name.includes('AQ1500') || a.metadata?.model?.includes('AQ1500'));

    const jfc1250Assets = assets.filter((a: any) => {
        const name = (a.name || '').toUpperCase();
        const model = (a.metadata?.model || '').toUpperCase();
        return name.includes('JFC') && (name.includes('1250') || model.includes('1250'));
    });
    // Include both 1500 AND 1800 in the 1500 category (as 1800 is incorrect/should be 1500)
    const jfc1500Assets = assets.filter((a: any) => {
        const name = (a.name || '').toUpperCase();
        const model = (a.metadata?.model || '').toUpperCase();
        return name.includes('JFC') && (name.includes('1500') || model.includes('1500'));
    });
    const sealiteAssets = assets.filter((a: any) => a.name.includes('SEALITE') || a.metadata?.model?.includes('SEALITE') || a.name.includes('SLB 1500'));

    // Remaining assets (unclassified or others)
    const otherAssets = assets.filter((a: any) =>
        !jet9000Assets.find(x => x.id === a.id) &&
        !jet2000Assets.find(x => x.id === a.id) &&
        !mobilisBCAssets.find(x => x.id === a.id) &&
        !mobilisAQAssets.find(x => x.id === a.id) &&
        !jfc1250Assets.find(x => x.id === a.id) &&
        !jfc1500Assets.find(x => x.id === a.id) &&
        !sealiteAssets.find(x => x.id === a.id)
    );

    // Filter item types for each section
    // Use 'itemTypes' (combined) to include structure types in the cards
    const jet2000Types = itemTypes.filter((t: any) => t.name.includes('JET 2000'));
    const jet9000Types = itemTypes.filter((t: any) => t.name.includes('JET 9000'));

    const mobilisBCTypes = itemTypes.filter((t: any) => t.name.includes('BC1241') || t.name.includes('BC1242'));
    const mobilisAQTypes = itemTypes.filter((t: any) => t.name.includes('AQ1500'));
    const jfc1250Types = itemTypes.filter((t: any) => {
        const name = (t.name || '').toUpperCase();
        return name.includes('JFC') && name.includes('1250');
    });
    // Include both 1500 AND 1800 types in the 1500 category
    const jfc1500Types = itemTypes.filter((t: any) => {
        const name = (t.name || '').toUpperCase();
        return name.includes('JFC') && name.includes('1500');
    });
    const sealiteTypes = itemTypes.filter((t: any) => t.name.includes('SEALITE') || t.name.includes('SLB 1500'));

    // Other types (excluding the above)
    const otherTypes = itemTypes.filter((t: any) =>
        !jet2000Types.find(x => x.id === t.id) &&
        !jet9000Types.find(x => x.id === t.id) &&
        !mobilisBCTypes.find(x => x.id === t.id) &&
        !mobilisAQTypes.find(x => x.id === t.id) &&
        !jfc1250Types.find(x => x.id === t.id) &&
        !jfc1500Types.find(x => x.id === t.id) &&
        !sealiteTypes.find(x => x.id === t.id)
    );

    // Valid types for creation (Standard OR In Use OR Structuur)
    const validBuoyTypes = itemTypes.filter((t: any) => {
        const isStandard = inventoryItems.some((i: any) => i.category === 'Boei' && i.name === t.name);
        const isInUse = assets.some((a: any) => a.item_id === t.id);
        const isStructureType = t.category === 'Structuur';
        return isStandard || isInUse || isStructureType;
    });

    return (
        <div className="space-y-8">
            {/* Headers / Intro */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-app-text-primary">Voorraad Beheer</h2>
                <AddBuoyButton itemTypes={validBuoyTypes} buoys={buoys} />
            </div>

            {/* JET 2000 Management */}
            <StockManagement
                title="JET 2000"
                assets={jet2000Assets}
                category="Boei"
                itemTypes={jet2000Types}
                showColor={true}
                buoys={buoys}
            />

            {/* JET 9000 Management */}
            <StockManagement
                title="JET 9000"
                assets={jet9000Assets}
                category="Boei"
                itemTypes={jet9000Types}
                showColor={true}
                buoys={buoys}
            />

            {/* Mobilis BC1241 Management */}
            <StockManagement
                title="Mobilis BC1241/BC1242"
                assets={mobilisBCAssets}
                category="Boei"
                itemTypes={mobilisBCTypes}
                showColor={true}
                buoys={buoys}
            />

            {/* Mobilis AQ1500 Management */}
            <StockManagement
                title="Mobilis AQ1500"
                assets={mobilisAQAssets}
                category="Boei"
                itemTypes={mobilisAQTypes}
                showColor={true}
                buoys={buoys}
            />

            {/* JFC 1250 Management */}
            {(jfc1250Assets.length > 0 || jfc1250Types.length > 0) && (
                <StockManagement
                    title="JFC Marine 1250"
                    assets={jfc1250Assets}
                    category="Boei"
                    itemTypes={jfc1250Types}
                    showColor={true}
                buoys={buoys}
                />
            )}

            {/* JFC 1500 Management */}
            {(jfc1500Assets.length > 0 || jfc1500Types.length > 0) && (
                <StockManagement
                    title="JFC Marine 1500"
                    assets={jfc1500Assets}
                    category="Boei"
                    itemTypes={jfc1500Types}
                    showColor={true}
                buoys={buoys}
                />
            )}

            {/* Sealite Management */}
            {sealiteAssets.length > 0 && (
                <StockManagement
                    title="Sealite SLB 1500"
                    assets={sealiteAssets}
                    category="Boei"
                    itemTypes={sealiteTypes}
                    showColor={true}
                buoys={buoys}
                />
            )}

            {/* Other Assets - Now using StockManagement for consistency */}
            {otherAssets.length > 0 && (
                <div className="mt-8">
                    <StockManagement
                        title="Overige Boeien"
                        assets={otherAssets}
                        category="Boei"
                        itemTypes={otherTypes}
                        showColor={true}
                buoys={buoys}
                    />
                </div>
            )}

            {/* Structuren Section - Only show structures not already categorized above */}
            {(() => {
                const remainingStructures = structuurAssets.filter((a: any) =>
                    !jet9000Assets.find(x => x.id === a.id) &&
                    !jet2000Assets.find(x => x.id === a.id) &&
                    !mobilisBCAssets.find(x => x.id === a.id) &&
                    !mobilisAQAssets.find(x => x.id === a.id) &&
                    !jfc1250Assets.find(x => x.id === a.id) &&
                    !jfc1500Assets.find(x => x.id === a.id) &&
                    !sealiteAssets.find(x => x.id === a.id) &&
                    !otherAssets.find(x => x.id === a.id)
                );

                const remainingTypes = structuurTypes.filter((t: any) =>
                    !jet2000Types.find(x => x.id === t.id) &&
                    !jet9000Types.find(x => x.id === t.id) &&
                    !mobilisBCTypes.find(x => x.id === t.id) &&
                    !mobilisAQTypes.find(x => x.id === t.id) &&
                    !jfc1250Types.find(x => x.id === t.id) &&
                    !jfc1500Types.find(x => x.id === t.id) &&
                    !sealiteTypes.find(x => x.id === t.id) &&
                    !otherTypes.find(x => x.id === t.id)
                );

                if (remainingStructures.length === 0 && remainingTypes.length === 0) return null;

                return (
                    <div className="mt-8">
                        <StockManagement
                            title="Overige Structuren"
                            assets={remainingStructures}
                            category="Structuur"
                            itemTypes={remainingTypes}
                            showColor={false}
                            buoys={buoys}
                        />
                    </div>
                );
            })()}
        </div>
    );
}
