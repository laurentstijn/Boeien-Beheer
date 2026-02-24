'use client';

import { useState, Fragment } from 'react';
import { incrementStock, decrementStock, deleteAsset, updateItemMinStock } from '@/app/actions';
import { Loader2, Pen, Trash2, Link as LinkIcon, Link2Off } from 'lucide-react';
import clsx from 'clsx';
import { AssetDialog } from './AssetDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { useRouter } from 'next/navigation';
import { StoneIcon } from './StoneIcon';
import { inventoryItems } from '@/lib/data';

interface StenenManagementProps {
    title: string;
    assets: any[];
    category: string;
    itemTypes: any[];
    buoys?: any[];
}

export function StenenManagement({ title, assets, category, itemTypes, buoys = [] }: StenenManagementProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [loadingMin, setLoadingMin] = useState<string | null>(null);
    const [editAsset, setEditAsset] = useState<any | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const router = useRouter();

    // Group assets by Weight + Shape
    // If metadata is missing, fallback to Item Name
    const rows = new Map<string, {
        id: string; // usually the itemType id or custom
        name: string; // Display name for the group (e.g. "4 ton Ovaal")
        weight: string;
        shape: string;
        total: number;
        withChain: number;
        withoutChain: number;
        notes: Set<string>;
        itemType: any;
        assets: any[];
    }>();

    // Helper to generate key
    const getKey = (asset: any) => {
        let w = asset.metadata?.weight;
        let s = asset.metadata?.shape;

        // Fallback: If metadata is missing, try to derive from Item Type
        if (!w || !s) {
            const type = itemTypes.find(t => t.id === asset.item_id);

            if (type) {
                // 1. Try specs first
                if (type.specs) {
                    w = w || type.specs.weight;
                    s = s || type.specs.shape;
                }

                // 2. Parse name "4T Ovaal" or "Betonblok 4T Ovaal" -> w=4, s=Ovaal
                if (!w || !s) {
                    const nameParts = type.name.match(/(\d+(?:\.\d+)?)T?\s+(\w+)/i);
                    if (nameParts) {
                        w = w || nameParts[1]; // "4"
                        s = s || nameParts[2]; // "Ovaal"
                    }
                }
            }
        }

        if (w && s) return `${w} ${s}`; // e.g. "1000kg Vierkant" or "4 ton Ovaal"
        return asset.name || 'Onbekend';
    };

    // 1. Populate rows with existing assets
    assets.forEach(asset => {
        const key = getKey(asset);

        const type = itemTypes.find(t => t.id === asset.item_id);
        const typeSpecs = type?.specs || {};

        if (!rows.has(key)) {
            rows.set(key, {
                id: asset.item_id || 'custom',
                name: key,
                weight: asset.metadata?.weight || typeSpecs.weight || '',
                shape: asset.metadata?.shape || typeSpecs.shape || '',
                total: 0,
                withChain: 0,
                withoutChain: 0,
                notes: new Set(),
                itemType: type,
                assets: []
            });
        }

        const row = rows.get(key)!;
        row.assets.push(asset);
        row.total++;

        // Chain logic: Deployed OR metadata says so
        const hasChain = asset.status === 'deployed' || asset.metadata?.hasChain === true || asset.metadata?.chain === 'Ja';
        if (hasChain) row.withChain++;
        else row.withoutChain++;

        if (asset.metadata?.notes) {
            row.notes.add(asset.metadata.notes);
        }
    });

    // 2. Ensure all item types are represented, even if count is 0
    itemTypes.forEach(itemType => {
        // Construct the key for this item type to see if it already exists
        // Assuming itemType.details contains format like "Ovaal" or metadata logic
        // For Stenen, itemType.name is usually "Betonblok 4T Ovaal"
        // We need to parse this or map it to our display key.
        // Let's assume the display key logic:
        // "Betonblok 4T Ovaal" -> "4 ton Ovaal"?
        // Or if we can't parse it easily, we might rely on the fact that 
        // if assets exist, they are grouped.
        // But for empty items, we want to show them too.

        // Simple heuristic: check if any existing row has this item_id, 
        // OR try to create a row from the itemType name if strictly needed.
        // For now, let's just stick to the requested "Fix + button" logic 
        // which implies we need to be able to find the ITEM NAME from the ROW.
    });

    // Convert map to sorted array
    const sortedRows = Array.from(rows.values())
        .sort((a, b) => {
            // Sort by weight (descending) then shape
            const wa = parseFloat(a.weight) || 0;
            const wb = parseFloat(b.weight) || 0;
            if (wa !== wb) return wb - wa;
            return a.shape.localeCompare(b.shape);
        });

    const handleStockChange = async (row: any, change: number) => {
        const id = `${row.name}-${change > 0 ? 'inc' : 'dec'}`;
        setLoading(id);

        try {
            // Logic to find the correct itemName for the DB action
            let itemName = '';

            // 1. Try to find a representative asset to get the name
            const representative = row.assets[0];
            if (representative) {
                itemName = representative.name;
            } else {
                // 2. Fallback: Try to find an itemType that matches this row's weight/shape
                // The row name is likely "4 ton Ovaal"
                // We need to find an itemType like "Betonblok 4T Ovaal"
                const match = itemTypes.find(t => {
                    // Normalize helper
                    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
                    const rowNameNorm = norm(row.name); // 4tonovaal
                    const typeNameNorm = norm(t.name); // betonblok4tovaal

                    // Check if type name contains the essential parts of row name
                    // OR if type specs match
                    if (row.weight && row.shape) {
                        // Check specs match
                        if (t.specs && t.specs.weight === row.weight && t.specs.shape === row.shape) {
                            return true;
                        }
                        return t.name.includes(row.weight) && t.name.includes(row.shape);
                    }
                    return typeNameNorm.includes(rowNameNorm);
                });

                if (match) {
                    itemName = match.name;
                } else {
                    // Final fallback
                    console.warn('Could not find exact item match for', row.name);
                    itemName = row.name;
                }
            }

            if (change > 0) {
                await incrementStock(category, itemName);
            } else {
                await decrementStock(category, itemName);
            }
            router.refresh();
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
            // Mutate locally for instant feedback
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
        router.refresh();
    };

    return (
        <div className="bg-app-surface border border-app-border rounded-xl md:rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="p-4 md:p-6 border-b border-app-border bg-app-bg/50 flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-bold text-app-text-primary">{title}</h3>
                <div className="flex items-center gap-3">
                    <div className="bg-app-surface border border-app-border px-3 py-1 rounded-full text-xs font-mono font-medium text-app-text-secondary">
                        Totaal: {assets.length}
                    </div>
                    <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm flex items-center gap-2"
                    >
                        <span className="text-lg leading-none">+</span>
                        Nieuw Type
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-app-bg/50 text-app-text-secondary border-b border-app-border">
                            <th className="px-4 md:px-6 py-4 font-semibold">Type</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Min.</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Totaal</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Met Ketting</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Zonder Ketting</th>
                            <th className="px-4 md:px-6 py-4 font-semibold">Opmerkingen</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-right">Acties</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                        {sortedRows.map((row) => (
                            <Fragment key={row.name}>
                                <tr
                                    className={clsx(
                                        "hover:bg-app-surface-hover transition-colors group cursor-pointer",
                                        expandedRow === row.name && "bg-app-surface-hover"
                                    )}
                                    onClick={() => setExpandedRow(expandedRow === row.name ? null : row.name)}
                                >
                                    {/* Type */}
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-app-bg border border-app-border flex items-center justify-center">
                                                <StoneIcon shape={row.shape} size="sm" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-app-text-primary">{row.name}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Min */}
                                    <td className="px-4 md:px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMinStockChange(row, -1); }}
                                                disabled={!!loadingMin || !row.itemType?.id || String(row.itemType.id).startsWith('custom') || (row.itemType.min_stock_level || 0) <= 0}
                                                className="w-5 h-5 flex items-center justify-center rounded border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all font-mono text-xs"
                                            >
                                                -
                                            </button>
                                            <span className="w-4 text-center font-mono font-medium text-xs text-app-text-secondary">
                                                {loadingMin?.includes(`${row.name}-min-`) ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (row.itemType?.min_stock_level || 0)}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMinStockChange(row, 1); }}
                                                disabled={!!loadingMin || !row.itemType?.id || String(row.itemType.id).startsWith('custom')}
                                                className="w-5 h-5 flex items-center justify-center rounded border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all font-mono text-xs"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>

                                    {/* Total */}
                                    <td className="px-4 md:px-6 py-4 text-center font-mono font-bold text-lg">
                                        <span className={clsx(
                                            row.total <= (row.itemType?.min_stock_level || 0) && row.total > 0 ? "text-yellow-500" :
                                                row.total === 0 ? "text-red-500" : "text-app-text-primary"
                                        )}>
                                            {row.total}
                                        </span>
                                    </td>

                                    {/* With Chain */}
                                    <td className="px-4 md:px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-blue-600 font-medium bg-blue-500/10 py-1 px-2 rounded-lg border border-blue-500/20">
                                            <LinkIcon className="w-3 h-3" />
                                            <span>{row.withChain}</span>
                                        </div>
                                    </td>

                                    {/* Without Chain */}
                                    <td className="px-4 md:px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-app-text-secondary">
                                            <Link2Off className="w-3 h-3 opacity-50" />
                                            <span>{row.withoutChain}</span>
                                        </div>
                                    </td>

                                    {/* Notes */}
                                    <td className="px-4 md:px-6 py-4 max-w-[200px] truncate text-app-text-secondary italic text-xs">
                                        {Array.from(row.notes).join(', ')}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 md:px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleStockChange(row, -1)}
                                                disabled={!!loading || row.total <= 0}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all"
                                            >
                                                -
                                            </button>
                                            <button
                                                onClick={() => handleStockChange(row, 1)}
                                                disabled={!!loading}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-primary disabled:opacity-30 transition-all"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {expandedRow === row.name && (
                                    <tr className="bg-app-bg/30 shadow-inner">
                                        <td colSpan={8} className="px-4 md:px-6 py-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-xs uppercase tracking-wider font-semibold text-app-text-secondary px-2">
                                                    <span>Individuele Stenen</span>
                                                    <span>{row.assets.length} items</span>
                                                </div>
                                                <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-app-bg/50 text-app-text-secondary text-xs">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">Naam / ID</th>
                                                                <th className="px-4 py-2 text-left">Serienummer</th>
                                                                <th className="px-4 py-2 text-left">Status</th>
                                                                <th className="px-4 py-2 text-left">Locatie</th>
                                                                <th className="px-4 py-2 text-center">Ketting?</th>
                                                                <th className="px-4 py-2 text-left">Notities</th>
                                                                <th className="px-4 py-2 text-right">Actie</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-app-border/50">
                                                            {row.assets.map(asset => {
                                                                const hasChain = asset.status === 'deployed' || asset.metadata?.hasChain === true || asset.metadata?.chain === 'Ja';
                                                                return (
                                                                    <tr key={asset.id} className="hover:bg-app-bg/50 transition-colors">
                                                                        <td className="px-4 py-3 font-mono text-xs">{asset.name}</td>
                                                                        <td className="px-4 py-3 font-mono text-xs text-app-text-secondary">
                                                                            {asset.metadata?.article_number || '-'}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <span className={clsx(
                                                                                "px-2 py-0.5 rounded text-xs font-medium",
                                                                                asset.status === 'in_stock' && "bg-green-500/10 text-green-500",
                                                                                asset.status === 'deployed' && "bg-blue-500/10 text-blue-500",
                                                                                asset.status === 'maintenance' && "bg-orange-500/10 text-orange-500",
                                                                            )}>
                                                                                {asset.status === 'in_stock' ? 'Op Voorraad' :
                                                                                    asset.status === 'deployed' ? 'Uitgelegd' :
                                                                                        'Onderhoud'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-xs font-medium">
                                                                            {asset.status === 'deployed' && asset.deployment_id ? (
                                                                                <span className="font-bold text-app-text-primary flex items-center gap-1.5">
                                                                                    {buoys.find(b => b.id === asset.deployment_id)?.name || asset.location || 'Boei'}
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-app-text-secondary italic">
                                                                                    {asset.location || 'Magazijn'}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            {hasChain ? (
                                                                                <LinkIcon className="w-4 h-4 text-blue-500 mx-auto" />
                                                                            ) : (
                                                                                <span className="text-gray-300">-</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-app-text-secondary truncate max-w-[200px]">
                                                                            {asset.metadata?.notes || '-'}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <div className="flex justify-end gap-1">
                                                                                <button
                                                                                    className="text-xs font-medium text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded px-2 py-1 transition-colors"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        // Use a timestamp to force fresh state in the dialog
                                                                                        setEditAsset({ ...asset, _timestamp: Date.now() });
                                                                                    }}
                                                                                >
                                                                                    <Pen className="w-3 h-3" />
                                                                                </button>
                                                                                <button
                                                                                    className="text-xs font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded px-2 py-1 transition-colors"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setDeleteId(asset.id);
                                                                                    }}
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Dialog */}
            <AssetDialog
                isOpen={!!editAsset}
                onClose={() => setEditAsset(null)}
                mode="edit"
                asset={editAsset}
                itemTypes={itemTypes}
            />

            {/* Create Dialog */}
            <AssetDialog
                isOpen={isCreateDialogOpen}
                onClose={() => {
                    setIsCreateDialogOpen(false);
                    router.refresh();
                }}
                mode="create"
                asset={{ category }}
                itemTypes={itemTypes.filter(t => {
                    // Show standard types (defined in data.ts) or custom types that are in use
                    const isStandard = inventoryItems.some(i => i.category === 'Steen' && i.name === t.name);
                    const isInUse = assets.some(a => a.item_id === t.id);
                    return isStandard || isInUse;
                })}
            />

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Steen Verwijderen"
                message="Weet je zeker dat je deze steen wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
            />
        </div>
    );
}
