'use client';

import { useState, Fragment } from 'react';
import { incrementStock, decrementStock, deleteAsset, updateItemMinStock, deleteItemType } from '@/app/actions';
import { Loader2, Wrench, Pen, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { AssetDialog } from './AssetDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { BuoyIcon } from './BuoyIcon';
import { StructureIcon } from './StructureIcon';
import { useRouter } from 'next/navigation';
import { inventoryItems } from '@/lib/data';

interface StockManagementProps {
    title: string;
    assets: any[];
    category: string; // "Chain", "Steen", etc. needed for actions
    itemTypes: any[];
    showColor?: boolean; // If true, shows color column and grouping
    buoys?: any[];
}

// Helper to get color style
function getColorStyle(colorSlug: string) {
    const c = colorSlug.toLowerCase();

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

export function StockManagement({ title, assets, category, itemTypes, showColor = true, buoys = [] }: StockManagementProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [loadingMin, setLoadingMin] = useState<string | null>(null);
    const [editAsset, setEditAsset] = useState<any | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteItemTypeId, setDeleteItemTypeId] = useState<string | null>(null);
    const router = useRouter();

    // Group assets
    const rows = new Map<string, {
        id: string;
        name: string;
        color?: string;
        group?: string;
        inStock: number;
        maintenance: number;
        deployed: number;
        itemType: any;
        assets: any[];
    }>();

    // 1. Initialize rows from itemTypes
    itemTypes.forEach(type => {
        const key = type.name;

        let color = undefined;
        if (showColor) {
            const colorRegex = /(Rood|Groen|Geel|Blauw\/Geel|Blauw|Zwart|Wit|Noord|Oost|Zuid|West)/i;
            const match = type.name.match(colorRegex);
            if (match) color = match[0];
        }

        if (!rows.has(key)) {
            rows.set(key, {
                id: type.id,
                name: key,
                color,
                group: type.specs?.group,
                inStock: 0,
                status: 'OK', // Default status
                maintenance: 0,
                deployed: 0,
                itemType: type,
                assets: []
            } as any);
        }
    });

    // 2. Count assets and assign to rows
    assets.forEach(asset => {
        let rowKey = undefined;
        const typeById = itemTypes.find(t => t.id === asset.item_id);
        if (typeById) rowKey = typeById.name;

        if (!rowKey) {
            rowKey = asset.name;
        }

        if (!rows.has(rowKey)) {
            // Try check if it's a known color variant
            let color = undefined;
            if (showColor) {
                const colorRegex = /(Rood|Groen|Geel|Blauw\/Geel|Blauw|Zwart|Wit|Noord|Oost|Zuid|West)/i;
                const match = rowKey.match(colorRegex);
                if (match) color = match[0];
            }

            rows.set(rowKey, {
                id: 'custom-' + rowKey,
                name: rowKey,
                color,
                inStock: 0,
                maintenance: 0,
                deployed: 0,
                itemType: { name: rowKey },
                assets: []
            });
        }

        const row = rows.get(rowKey)!;
        row.assets.push(asset);

        if (asset.status === 'in_stock') row.inStock++;
        else if (asset.status === 'maintenance') row.maintenance++;
        else if (asset.status === 'deployed') row.deployed++;
    });

    const sortedRows = Array.from(rows.values())
        .sort((a, b) => {
            // 1. Group sorting
            if (a.group && b.group) {
                if (a.group !== b.group) return a.group.localeCompare(b.group);
            } else if (a.group) {
                return -1;
            } else if (b.group) {
                return 1;
            }

            // 2. Reserve check (Reserves always last)
            const aIsReserve = a.name.toLowerCase().includes('reserve');
            const bIsReserve = b.name.toLowerCase().includes('reserve');
            if (aIsReserve && !bIsReserve) return 1;
            if (!aIsReserve && bIsReserve) return -1;

            // 3. Structure check (Structures after standard items, but before reserves)
            // Note: Reserves are already filtered out above, so this applies to non-reserve structures
            const aIsStructure = a.assets.some((asset: any) => asset.category === 'Structuur');
            const bIsStructure = b.assets.some((asset: any) => asset.category === 'Structuur');
            if (aIsStructure && !bIsStructure) return 1;
            if (!aIsStructure && bIsStructure) return -1;

            // 4. Alphabetical sort
            return a.name.localeCompare(b.name);
        });

    const handleStockChange = async (row: any, change: number) => {
        const id = `${row.name}-${change > 0 ? 'inc' : 'dec'}`;
        setLoading(id);

        try {
            if (change > 0) {
                // Pass category and the EXACT item name (row.name)
                // We trust that row.name matches an Item Type name because rows are built from itemTypes.
                await incrementStock(category, row.name);
            } else {
                await decrementStock(category, row.name);
            }
        } finally {
            setLoading(null);
        }
    };

    const handleMinStockChange = async (row: any, change: number) => {
        if (!row.itemType || !row.itemType.id || String(row.itemType.id).startsWith('custom-')) return;
        const currentMin = row.itemType.min_stock_level || 0;
        const newMin = Math.max(0, currentMin + change);

        const id = `${row.name}-min-${change > 0 ? 'inc' : 'dec'}`;
        setLoadingMin(id);

        try {
            await updateItemMinStock(row.itemType.id, newMin);
            // Optioneel: we muteren de lokale referentie voor snellere UI response
            row.itemType.min_stock_level = newMin;
            router.refresh();
        } finally {
            setLoadingMin(null);
        }
    };


    const confirmDelete = async () => {
        if (!deleteId) return;
        await deleteAsset(deleteId);
        setDeleteId(null);
        router.refresh(); // Ensure UI updates
    };

    const confirmDeleteItemType = async () => {
        if (!deleteItemTypeId) return;
        setLoading(deleteItemTypeId);
        try {
            await deleteItemType(deleteItemTypeId);
        } finally {
            setLoading(null);
            setDeleteItemTypeId(null);
            router.refresh();
        }
    };

    return (
        <div className="bg-app-surface border border-app-border rounded-xl md:rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="p-4 md:p-6 border-b border-app-border bg-app-bg/50 flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-bold text-app-text-primary">{title}</h3>
                <div className="bg-app-surface border border-app-border px-3 py-1 rounded-full text-xs font-mono font-medium text-app-text-secondary">
                    Totaal Items: {assets.length}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-app-bg/50 text-app-text-secondary border-b border-app-border">
                            <th className="px-4 md:px-6 py-4 font-semibold w-1/3">Type / Variant</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Min.</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">In Opslag</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Uitgelegd</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">In Onderhoud</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-right">Acties</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                        {sortedRows.map((row, index) => {
                            // Header Logic
                            const isReserve = row.name.toLowerCase().includes('reserve');
                            const prevIsReserve = index > 0 && sortedRows[index - 1].name.toLowerCase().includes('reserve');

                            const isStructure = row.assets.some((asset: any) => asset.category === 'Structuur');
                            const prevIsStructure = index > 0 && sortedRows[index - 1].assets.some((asset: any) => asset.category === 'Structuur');

                            // Show "Structuren" only if:
                            // 1. It IS a structure
                            // 2. Previous was NOT a structure
                            // 3. It is NOT a reserve (reserves have their own header)
                            const showStructureHeader = isStructure && !prevIsStructure && !isReserve;

                            // Show "Reserve Drijflichamen" only if:
                            // 1. It IS a reserve
                            // 2. Previous was NOT a reserve
                            const showReserveHeader = isReserve && !prevIsReserve;

                            // Show Group Header (e.g. colors)
                            const showGroupHeader = row.group && (index === 0 || sortedRows[index - 1].group !== row.group);

                            return (
                                <Fragment key={row.name}>
                                    {showGroupHeader && (
                                        <tr className="bg-app-bg/30 text-app-text-secondary">
                                            <td colSpan={6} className="px-4 md:px-6 py-2 text-[10px] font-bold uppercase tracking-widest border-y border-app-border bg-app-bg/40 text-app-text-secondary/70">
                                                {row.group}
                                            </td>
                                        </tr>
                                    )}
                                    {showStructureHeader && (
                                        <tr className="bg-app-bg/30 text-app-text-secondary">
                                            <td colSpan={6} className="px-4 md:px-6 py-2 text-[10px] font-bold uppercase tracking-widest border-y border-app-border bg-app-bg/40 text-app-text-secondary/70">
                                                Structuren
                                            </td>
                                        </tr>
                                    )}
                                    {showReserveHeader && (
                                        <tr className="bg-app-bg/30 text-app-text-secondary">
                                            <td colSpan={6} className="px-4 md:px-6 py-2 text-[10px] font-bold uppercase tracking-widest border-y border-app-border bg-app-bg/40 text-app-text-secondary/70">
                                                Reserve Drijflichamen
                                            </td>
                                        </tr>
                                    )}
                                    <tr
                                        className={clsx(
                                            "hover:bg-app-surface-hover transition-colors group cursor-pointer",
                                            expandedRow === row.name && "bg-app-surface-hover"
                                        )}
                                        onClick={() => setExpandedRow(expandedRow === row.name ? null : row.name)}
                                    >
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {isStructure && !row.name.toLowerCase().includes('reserve') && (
                                                    <StructureIcon size="md" />
                                                )}
                                                {/* Show BuoyIcon for Reserves (even if structure) OR if showColor is true for normal buoys */}
                                                {(row.name.toLowerCase().includes('reserve') || (showColor && row.color && !isStructure)) && (
                                                    <BuoyIcon
                                                        color={row.color || 'Grijs'}
                                                        size="md"
                                                        shape={(() => {
                                                            const name = row.name.toLowerCase();
                                                            if (name.includes('reserve')) {
                                                                if (name.includes('jet 9000')) return 'quarter';
                                                                if (name.includes('jet 2000')) return 'half';
                                                            }
                                                            return 'circle';
                                                        })()}
                                                    />
                                                )}
                                                <span className="font-medium text-app-text-primary">{row.name}</span>
                                            </div>
                                        </td>

                                        <td className="px-4 md:px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleMinStockChange(row, -1)}
                                                    disabled={!!loadingMin || !row.itemType?.id || String(row.itemType.id).startsWith('custom') || (row.itemType.min_stock_level || 0) <= 0}
                                                    className="w-5 h-5 flex items-center justify-center rounded border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all font-mono text-xs"
                                                >
                                                    -
                                                </button>
                                                <span className="w-4 text-center font-mono font-medium text-xs text-app-text-secondary">
                                                    {loadingMin?.includes(`${row.name}-min-`) ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (row.itemType?.min_stock_level || 0)}
                                                </span>
                                                <button
                                                    onClick={() => handleMinStockChange(row, 1)}
                                                    disabled={!!loadingMin || !row.itemType?.id || String(row.itemType.id).startsWith('custom')}
                                                    className="w-5 h-5 flex items-center justify-center rounded border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all font-mono text-xs"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>

                                        {/* Stock Count */}
                                        <td className="px-4 md:px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleStockChange(row, -1)}
                                                    disabled={!!loading || row.inStock <= 0}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all font-bold"
                                                >
                                                    -
                                                </button>
                                                <span className={clsx(
                                                    "w-8 text-center font-mono font-bold text-lg",
                                                    row.inStock <= (row.itemType?.min_stock_level || 0) && row.inStock > 0 ? "text-yellow-500" :
                                                        row.inStock === 0 ? "text-red-500" : "text-app-text-primary"
                                                )}>
                                                    {loading?.includes(`${row.name}-`) && !loading?.includes('-min-') ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : row.inStock}
                                                </span>
                                                <button
                                                    onClick={() => handleStockChange(row, 1)}
                                                    disabled={!!loading}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-primary disabled:opacity-30 transition-all font-bold"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>

                                        {/* Deployed */}
                                        <td className="px-4 md:px-6 py-4 text-center">
                                            <span className="text-app-text-secondary font-mono">{row.deployed}</span>
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

                                        {/* Actions */}
                                        <td className="px-4 md:px-6 py-4 text-right px-0 mx-0">
                                            <div className="flex items-center justify-end gap-1 text-app-text-secondary transition-colors">
                                                {row.assets.length === 0 && row.itemType?.id && !String(row.itemType.id).startsWith('custom-') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDeleteItemTypeId(row.itemType.id); }}
                                                        className="p-2 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-all text-app-text-disabled"
                                                        title="Verwijder dit type (hele rij)"
                                                        disabled={loading === row.itemType.id}
                                                    >
                                                        {loading === row.itemType.id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setExpandedRow(expandedRow === row.name ? null : row.name); }}
                                                    className={clsx(
                                                        "p-2 rounded-full hover:bg-app-bg transition-all",
                                                        expandedRow === row.name && "rotate-90 text-blue-500 bg-blue-500/10"
                                                    )}
                                                    title="Details"
                                                >
                                                    <Pen className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {expandedRow === row.name && (
                                        <tr className="bg-app-bg/30">
                                            <td colSpan={6} className="px-4 md:px-6 py-4">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-xs uppercase tracking-wider font-semibold text-app-text-secondary px-2">
                                                        <span>Individuele Assets</span>
                                                        <span>{row.assets.length} items</span>
                                                    </div>
                                                    <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-app-bg/50 text-app-text-secondary text-xs">
                                                                <tr>
                                                                    <th className="px-4 py-2 w-10"></th>
                                                                    <th className="px-4 py-2 text-left">Naam / Artikel Nr.</th>
                                                                    <th className="px-4 py-2 text-left">Status</th>
                                                                    <th className="px-4 py-2 text-left">Locatie</th>
                                                                    <th className="px-4 py-2 text-left">Notities</th>
                                                                    <th className="px-4 py-2 text-right">Actie</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-app-border/50">
                                                                {row.assets.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={6} className="px-4 py-3 text-center text-app-text-disabled italic">
                                                                            Geen individuele items gevonden.
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    row.assets.map(asset => (
                                                                        <tr key={asset.id} className="hover:bg-app-bg/50 transition-colors">
                                                                            <td className="px-4 py-3 align-middle">
                                                                                {(category === 'Boei' || asset.name.toLowerCase().includes('reserve')) && (
                                                                                    <div className="w-6 h-6 flex items-center justify-center">
                                                                                        <BuoyIcon
                                                                                            color={row.color || 'Grijs'}
                                                                                            size="sm"
                                                                                            shape={(() => {
                                                                                                const name = asset.name.toLowerCase();
                                                                                                if (name.includes('reserve')) {
                                                                                                    if (name.includes('jet 9000')) return 'quarter';
                                                                                                    if (name.includes('jet 2000')) return 'half';
                                                                                                }
                                                                                                return 'circle';
                                                                                            })()}
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-3 align-middle">
                                                                                <div className="font-bold text-app-text-primary">{asset.name}</div>
                                                                                {asset.metadata?.article_number && (
                                                                                    <div className="text-xs font-mono text-app-text-secondary text-opacity-70">
                                                                                        {asset.metadata.article_number}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-3 align-middle">
                                                                                <span className={clsx(
                                                                                    "px-2 py-0.5 rounded text-xs font-medium inline-block",
                                                                                    asset.status === 'in_stock' && "bg-green-500/10 text-green-500",
                                                                                    asset.status === 'deployed' && "bg-blue-500/10 text-blue-500",
                                                                                    asset.status === 'maintenance' && "bg-orange-500/10 text-orange-500",
                                                                                    asset.status === 'broken' && "bg-red-500/10 text-red-500",
                                                                                    asset.status === 'lost' && "bg-gray-500/10 text-gray-500",
                                                                                )}>
                                                                                    {asset.status === 'in_stock' ? 'Op Voorraad' :
                                                                                        asset.status === 'deployed' ? 'Uitgelegd' :
                                                                                            asset.status === 'maintenance' ? 'Onderhoud' :
                                                                                                asset.status === 'broken' ? 'Defect' :
                                                                                                    asset.status === 'lost' ? 'Verloren' : asset.status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3 align-middle text-xs text-app-text-secondary">
                                                                                {asset.location || '-'}
                                                                            </td>
                                                                            <td className="px-4 py-3 align-middle text-xs text-app-text-secondary truncate max-w-[150px]">
                                                                                {asset.metadata?.notes || '-'}
                                                                            </td>
                                                                            <td className="px-4 py-3 align-middle text-right">
                                                                                <div className="flex justify-end gap-1">
                                                                                    <button
                                                                                        className="text-xs font-medium text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded px-2 py-1 transition-colors"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setEditAsset({ ...asset, _timestamp: Date.now() });
                                                                                        }}
                                                                                        title="Bewerken"
                                                                                    >
                                                                                        Bewerken
                                                                                    </button>
                                                                                    <button
                                                                                        className="text-xs font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded px-2 py-1 transition-colors"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setDeleteId(asset.id);
                                                                                        }}
                                                                                        title="Verwijderen"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <AssetDialog
                isOpen={!!editAsset}
                onClose={() => setEditAsset(null)}
                mode="edit"
                asset={editAsset}
                category={category}
                itemTypes={itemTypes.filter(t => {
                    const isStandard = inventoryItems.some(i => i.name === t.name && i.category === category);
                    const isInUse = assets.some(a => a.item_id === t.id);
                    return isStandard || isInUse;
                })}
                buoys={buoys}
            />

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Asset Verwijderen"
                message="Weet je zeker dat je dit item wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
            />

            <ConfirmDialog
                isOpen={!!deleteItemTypeId}
                onClose={() => setDeleteItemTypeId(null)}
                onConfirm={confirmDeleteItemType}
                title="Variant Verwijderen"
                message="Weet je zeker dat je dit type/variant wilt verwijderen? Dit zal de gehele rij uit je overzicht halen."
            />
        </div >
    );
}
