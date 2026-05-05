export const dynamic = 'force-dynamic';
import { getAssets, getDeployedBuoys, getZoneFilter, getCustomers } from "@/lib/db";
import UitleggenClient from "./UitleggenClient";

export default async function UitleggenPage() {
    const activeZone = await getZoneFilter();
    const [availableBuoys, availableChains, availableStones, availableTopmarks, availableLights, existingBuoys, customers] = await Promise.all([
        getAssets("Boei"),
        getAssets("Ketting"),
        getAssets("Steen"),
        getAssets("Topteken"),
        getAssets("Lamp"),
        getDeployedBuoys(),
        getCustomers()
    ]);

    // Filter for only in_stock assets
    const inStockBuoys = availableBuoys.filter(a => a.status === 'in_stock');
    const inStockChains = availableChains.filter(a => a.status === 'in_stock');
    const inStockStones = availableStones.filter(a => a.status === 'in_stock');
    const inStockTopmarks = availableTopmarks.filter(a => a.status === 'in_stock');
    const inStockLights = availableLights.filter(a => a.status === 'in_stock');

    return (
        <UitleggenClient
            availableBuoys={inStockBuoys}
            availableChains={inStockChains}
            availableStones={inStockStones}
            availableTopmarks={inStockTopmarks}
            availableLights={inStockLights}
            existingBuoys={existingBuoys}
            activeZone={activeZone}
            customers={customers}
        />
    );
}
