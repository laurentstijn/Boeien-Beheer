"use client";

import { Package } from "lucide-react";

interface StructureInventorySummaryProps {
    assets: any[];
}

export function StructureInventorySummary({ assets }: StructureInventorySummaryProps) {
    // Group assets by name
    const counts: Record<string, number> = {};
    assets.forEach(asset => {
        counts[asset.name] = (counts[asset.name] || 0) + 1;
    });

    return (
        <div className="bg-app-surface rounded-xl border border-app-border p-6 shadow-sm">
            <h3 className="text-lg font-bold text-app-text-primary mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-app-text-secondary" />
                Voorraad Structuren
            </h3>
            <div className="space-y-2">
                {Object.entries(counts).length === 0 ? (
                    <div className="text-app-text-secondary italic">Geen structuren op voorraad.</div>
                ) : (
                    Object.entries(counts).sort(([, a], [, b]) => b - a).map(([name, count]) => (
                        <div key={name} className="flex items-center justify-between p-3 bg-app-bg rounded-lg border border-app-border">
                            <span className="font-medium text-app-text-primary">{name}</span>
                            <span className="text-lg font-bold text-app-text-primary bg-app-surface px-3 py-1 rounded-md border border-app-border/50">
                                {count}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
