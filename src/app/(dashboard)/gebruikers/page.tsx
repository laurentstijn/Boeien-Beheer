import { GebruikersClient } from "./GebruikersClient";

export const metadata = {
    title: "Gebruikers | Boeien Beheer",
};

export default function GebruikersPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-app-text-primary">Gebruikers (Admin)</h1>
            <p className="text-app-text-secondary">Beheer hier wie toegang heeft tot het platform, en welke rol en zone zij toegewezen krijgen.</p>
            <GebruikersClient />
        </div>
    );
}
