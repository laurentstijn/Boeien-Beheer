import { getDeployedBuoys } from "@/lib/db";
import { RapportenClient } from "./RapportenClient";

export const dynamic = 'force-dynamic';

export default async function RapportenPage() {
    const rawBuoys = await getDeployedBuoys();

    // Filter buoys: next_service_due <= (today + 14 days) or overdue.
    // Also exclude non-active statuses like 'Hidden' or 'Lost' (unless they need action?)
    // Actually, we'll pass all buoys and let the client filter it, or do it here.
    // Doing it here is fine, but client allows dynamic filtering. Let's do it in client.

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-app-text-primary">Rapporten</h1>
            <p className="text-app-text-secondary">Overzicht van buoys die binnenkort onderhoud nodig hebben.</p>
            <RapportenClient initialBuoys={rawBuoys} />
        </div>
    );
}
