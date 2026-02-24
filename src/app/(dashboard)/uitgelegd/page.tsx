export const dynamic = 'force-dynamic';
import { getDeployedBuoys, getBuoyConfigurations, getAssets, getZoneFilter } from "@/lib/db";
import UitgelegdClient from "./UitgelegdClient";
export default async function UitgelegdPage() {
    const activeZone = await getZoneFilter();
    const deployedBuoys = await getDeployedBuoys();
    const buoyConfigurations = await getBuoyConfigurations();

    // Fetch available lamps for linking
    const allLamps = await getAssets("Lamp");
    const availableLamps = allLamps.filter((l: any) => l.status === 'in_stock');

    // Fetch available chains for linking
    const allChains = await getAssets("Ketting");
    const availableChains = allChains.filter((c: any) => c.status === 'in_stock');

    // Fetch available stones for linking
    const allStones = await getAssets("Steen");
    const availableStones = allStones.filter((s: any) => s.status === 'in_stock');

    return <UitgelegdClient
        initialBuoys={deployedBuoys}
        buoyConfigurations={buoyConfigurations}
        availableLamps={availableLamps}
        availableChains={availableChains}
        availableStones={availableStones}
        activeZone={activeZone}
    />;
}
