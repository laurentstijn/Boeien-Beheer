import { DagelijksRapportClient } from "./DagelijksRapportClient";

export const dynamic = 'force-dynamic';

export default function DagelijksRapportPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-app-text-primary">Dagelijks Rapport</h1>
            <p className="text-app-text-secondary">Overzicht van de uitgevoerde onderhoudstaken op een specifieke dag.</p>
            <DagelijksRapportClient />
        </div>
    );
}
