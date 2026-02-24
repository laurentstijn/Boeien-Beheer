'use client';

import { useState } from 'react';
import { incrementStock, decrementStock } from '@/app/actions';
import { Loader2, Pen, Trash2, Wrench } from 'lucide-react';
import clsx from 'clsx';
import { AssetDialog } from './AssetDialog';
import { BuoyIcon } from './BuoyIcon';

interface BuoyStockManagementProps {
    title: string;
    assets: any[]; // All assets of this category (e.g. all JET 2000s)
    model: string; // "JET 2000", "JET 9000", etc.
    itemTypes: any[];
}

// Helper to get color style (reused from AssetDialog logic)
function getColorStyle(color: string) {
    const c = color.toLowerCase();

    if (c.includes('rood')) return 'bg-red-600 border-red-700';
    if (c.includes('groen')) return 'bg-green-600 border-green-700';
    if (c.includes('geel') && !c.includes('blauw') && !c.includes('zwart')) return 'bg-yellow-400 border-yellow-500';
    if (c.includes('zwart')) return 'bg-black border-gray-800';
    if (c.includes('wit')) return 'bg-white border-gray-300';
    if (c.includes('blauw') && c.includes('geel')) return 'bg-[linear-gradient(to_bottom,#3b82f6_50%,#facc15_50%)] border-blue-600';
    if (c.includes('blauw')) return 'bg-blue-600 border-blue-700';

    // Cardinals
    if (c.includes('noord')) return 'bg-[linear-gradient(to_bottom,black_50%,#facc15_50%)] border-black';
    if (c.includes('zuid')) return 'bg-[linear-gradient(to_bottom,#facc15_50%,black_50%)] border-black';
    if (c.includes('oost')) return 'bg-[linear-gradient(to_bottom,black_33%,#facc15_33%,#facc15_66%,black_66%)] border-black';
    if (c.includes('west')) return 'bg-[linear-gradient(to_bottom,#facc15_33%,black_33%,black_66%,#facc15_66%)] border-black';

    return 'bg-gray-400 border-gray-500';
}

export function BuoyStockManagement({ title, assets, model, itemTypes }: BuoyStockManagementProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [editAsset, setEditAsset] = useState<any | null>(null);

    // Group assets by color
    const rows = new Map<string, {
        color: string;
        complete: number;
        reserve: number;
        maintenance: number;
        assets: any[];
    }>();

    // Initialize with known variants if possible, or build dynamically
    // Building dynamically is safer for now based on what's in DB + what's in itemTypes could be better but let's stick to DB + simple inference

    assets.forEach(asset => {
        let color = asset.metadata?.color || 'Onbekend';
        // Normalize color naming if needed

        if (!rows.has(color)) {
            rows.set(color, { color, complete: 0, reserve: 0, maintenance: 0, assets: [] });
        }

        const row = rows.get(color)!;
        row.assets.push(asset);

        if (asset.status === 'maintenance') {
            row.maintenance++;
        } else if (asset.metadata?.isReserve) {
            // Only count as 'stock' for the +/- buttons if it's in_stock
            if (asset.status === 'in_stock') row.reserve++;
        } else {
            if (asset.status === 'in_stock') row.complete++;
        }
    });

    // Also verify we have rows for Colors that might have 0 stock but ARE in the itemTypes list for this model
    // This allows adding stock from 0.
    itemTypes.forEach(type => {
        if (type.name.includes(model)) {
            // Extract color
            const colorRegex = /(Rood|Groen|Geel|Blauw\/Geel|Blauw|Zwart|Wit|Noord|Oost|Zuid|West)/i;
            const match = type.name.match(colorRegex);
            const color = match ? match[0] : 'Standaard';

            // If this item type name is exactly "Model Color" or "Model Color Reserve"...
            // We want to ensure a row exists for "Color".
            if (!rows.has(color)) {
                rows.set(color, { color, complete: 0, reserve: 0, maintenance: 0, assets: [] });
            }
        }
    });

    const sortedRows = Array.from(rows.values()).sort((a, b) => a.color.localeCompare(b.color));

    const handleStockChange = async (color: string, isReserve: boolean, change: number) => {
        const id = `${model}-${color}-${isReserve ? 'res' : 'comp'}-${change > 0 ? 'inc' : 'dec'}`;
        setLoading(id);

        try {
            const fullItemName = `${model} ${color}${isReserve ? ' Reserve' : ''}`;
            if (change > 0) {
                await incrementStock('Boei', fullItemName);
            } else {
                await decrementStock('Boei', fullItemName);
            }
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-app-surface border border-app-border rounded-xl md:rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="p-4 md:p-6 border-b border-app-border bg-app-bg/50 flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-bold text-app-text-primary">{title}</h3>
                <div className="bg-app-surface border border-app-border px-3 py-1 rounded-full text-xs font-mono font-medium text-app-text-secondary">
                    Totaal: {assets.length}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-app-bg/50 text-app-text-secondary border-b border-app-border">
                            <th className="px-4 md:px-6 py-4 font-semibold w-1/4">Kleur</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Aantal (Compleet)</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Reserve Drijflichamen</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">In Onderhoud</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-right">Acties</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                        {sortedRows.map((row) => (
                            <tr key={row.color} className="hover:bg-app-surface-hover transition-colors group">
                                <td className="px-4 md:px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            // Extract core color
                                            const isReserve = row.color.toLowerCase().includes('reserve');
                                            const cleanColor = row.color
                                                .replace(/JET \d+/i, '')
                                                .replace(/Reserve/i, '')
                                                .trim();

                                            // Determine shape
                                            const shapeVal = isReserve
                                                ? (model.includes('9000') ? 'quarter' : 'half')
                                                : 'circle';

                                            return (
                                                <BuoyIcon
                                                    color={cleanColor}
                                                    size="md"
                                                    shape={shapeVal}
                                                    data-debug-row-color={row.color}
                                                    data-debug-is-reserve={isReserve.toString()}
                                                    data-debug-model={model}
                                                />
                                            );
                                        })()}
                                        <span className="font-medium text-app-text-primary">{row.color}</span>
                                    </div>
                                </td>

                                {/* Complete Stock */}
                                <td className="px-4 md:px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleStockChange(row.color, false, -1)}
                                            disabled={!!loading || row.complete <= 0}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center font-mono font-bold text-lg text-app-text-primary">
                                            {loading?.includes(`${model}-${row.color}-comp`) ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : row.complete}
                                        </span>
                                        <button
                                            onClick={() => handleStockChange(row.color, false, 1)}
                                            disabled={!!loading}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-primary disabled:opacity-30 transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                </td>

                                {/* Reserve Stock */}
                                <td className="px-4 md:px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleStockChange(row.color, true, -1)}
                                            disabled={!!loading || row.reserve <= 0}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center font-mono font-bold text-lg text-app-text-primary">
                                            {loading?.includes(`${model}-${row.color}-res`) ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : row.reserve}
                                        </span>
                                        <button
                                            onClick={() => handleStockChange(row.color, true, 1)}
                                            disabled={!!loading}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-primary disabled:opacity-30 transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                </td>

                                {/* Maintenance */}
                                <td className="px-4 md:px-6 py-4 text-center">
                                    <span className={clsx(
                                        "px-3 py-1 rounded-full text-xs font-bold",
                                        row.maintenance > 0 ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" : "text-app-text-disabled"
                                    )}>
                                        {row.maintenance}
                                    </span>
                                </td>

                                {/* Actions (Simplified) */}
                                <td className="px-4 md:px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Could add detailed view link here later */}
                                        <button className="p-2 text-app-text-secondary hover:text-blue-500 transition-colors" title="Details">
                                            <Wrench className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {sortedRows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-app-text-secondary italic">
                                    Geen items gevonden.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AssetDialog
                isOpen={!!editAsset}
                onClose={() => setEditAsset(null)}
                mode="edit"
                asset={editAsset}
            />
        </div>
    );
}
