import NotitiesClient from "./NotitiesClient";
import { getZoneFilter } from "@/lib/db";

export default async function NotitiesPage() {
    const activeZone = await getZoneFilter();

    return (
        <div className="h-full bg-app-bg overflow-hidden">
            <NotitiesClient activeZone={activeZone} />
        </div>
    );
}
