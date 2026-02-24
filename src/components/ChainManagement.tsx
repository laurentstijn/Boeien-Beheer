'use client';

import { useState, Fragment } from 'react';
import { createAsset, decrementStock, deleteAsset, updateItemMinStock } from '@/app/actions';
import { Loader2, Pen, Trash2, Anchor, Link as LinkIcon } from 'lucide-react';
import clsx from 'clsx';
import { AssetDialog } from './AssetDialog';
import { useRouter } from 'next/navigation';
import { ChainIcon } from './ChainIcon';

interface ChainManagementProps {
    title: string;
    assets: any[];
    itemTypes: any[];
    buoys?: any[];
}

// Configuration from ChainSummary to ensure matching grouping
const CHAIN_TYPES = [
    { name: "Rood", specs: { length: "15m", thickness: "25mm", swivel: "Nee" }, match: "Ketting Rood" },
    { name: "Blauw", specs: { length: "25m", thickness: "25mm", swivel: "Ja" }, match: "Ketting Blauw" },
    { name: "Geel", specs: { length: "25m", thickness: "20mm", swivel: "Ja" }, match: "Ketting Geel" },
    { name: "Wit", specs: { length: "15m", thickness: "20mm", swivel: "Ja" }, match: "Ketting Wit" },
];

export function ChainManagement({ title, assets, itemTypes, buoys = [] }: ChainManagementProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [loadingMin, setLoadingMin] = useState<string | null>(null);
    const [editAsset, setEditAsset] = useState<any | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const router = useRouter();

    // Dynamic row generation based on available item types
    // We merge the hardcoded specs metadata with the actual database items
    const rows = itemTypes.map(itemType => {
        // Check if this item type corresponds to one of our hardcoded "standard" types
        // to retrieve default specs if they exist.
        const standardDef = CHAIN_TYPES.find(t => t.match === itemType.name);

        // Find all assets that belong to this item type
        const matches = assets.filter(a => a.item_id === itemType.id);

        // Count stock statuses
        const inStock = matches.filter(a => a.status === 'in_stock').length;
        const deployed = matches.filter(a => a.status === 'deployed').length;
        const maintenance = matches.filter(a => a.status === 'maintenance').length;

        // Count swivels
        const metDraainagel = matches.filter(a => a.metadata?.swivel === 'Ja').length;
        const zonderDraainagel = matches.filter(a => a.metadata?.swivel === 'Nee' || !a.metadata?.swivel).length;

        // Determine name for display (e.g. "Rood" from "Ketting Rood")
        // If it's a custom name like "Ketting Oranje", we might want to show "Oranje" or the full name.
        let displayName = itemType.name;
        if (standardDef) {
            displayName = standardDef.name;
        } else {
            // Try to make it look nice if it starts with "Ketting"
            displayName = displayName.replace(/^Ketting\s+/i, '');
        }

        // Specs: use hardcoded if available, otherwise from DB if we had them, or empty placeholders
        const specs = standardDef?.specs || {
            length: itemType.specs?.length || '-',
            thickness: itemType.specs?.thickness || '-',
            swivel: '-'
        };

        return {
            name: displayName,
            match: itemType.name, // The full name used for identification
            specs,
            itemType,
            itemId: itemType.id,
            total: matches.length,
            inStock,
            deployed,
            maintenance,
            metDraainagel,
            zonderDraainagel,
            assets: matches
        };
    }).filter(row => {
        // Always show the standard types ("Rood", "Blauw", etc.) even if empty
        const isStandard = CHAIN_TYPES.some(t => t.match === row.match);
        // For custom types, only show if there are assets (total > 0)
        return isStandard || row.total > 0;
    });

    // Optional: Sort rows to keep Rood/Blauw/etc at the top if desired, or just alphabetical
    // For now, we leave them in the order of itemTypes (which usually is DB insertion order or alphabetical)

    const handleAdd = async (row: typeof rows[0]) => {
        const id = `${row.name}-inc`;
        setLoading(id);

        try {
            const formData = new FormData();
            // Core fields
            formData.append('itemId', row.itemId);
            if (row.itemId === 'custom') {
                formData.append('customItemName', row.match);
            }
            formData.append('status', 'in_stock');
            formData.append('location', 'Magazijn');
            formData.append('article_number', ''); // user can edit later

            // Metadata from specs
            formData.append('notes', 'Nieuw aangemaakt');
            formData.append('swivel', row.specs.swivel === 'Ja' ? 'on' : 'off');
            // For chains, "hasChain" is redundant, but we can store specs if needed

            await createAsset(null, formData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    const handleRemove = async (row: typeof rows[0]) => {
        const id = `${row.name}-dec`;
        setLoading(id);
        try {
            await decrementStock("Ketting", row.match);
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


    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (assetId: string) => {
        setDeleteId(assetId);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        const result = await deleteAsset(deleteId);
        if (!result.success) {
            alert('Fout bij verwijderen: ' + result.message);
        } else {
            router.refresh();
        }
        setDeleteId(null);
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
                            <th className="px-4 md:px-6 py-4 font-semibold">Type / Kleur</th>
                            <th className="px-4 md:px-6 py-4 font-semibold">Specs</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Min.</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">In Opslag</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-center">Uitgelegd</th>
                            <th className="px-4 md:px-6 py-4 font-semibold text-right">Acties</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                        {rows.map((row) => (
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
                                                <ChainIcon color={row.name} size="sm" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-app-text-primary">{row.match}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Specs */}
                                    <td className="px-4 md:px-6 py-4 text-app-text-secondary">
                                        <div className="flex flex-col text-xs space-y-1">
                                            <span className="font-medium text-app-text-primary">
                                                {row.specs.length} {row.specs.thickness && row.specs.thickness !== '-' ? ` / ${row.specs.thickness}` : ''}
                                            </span>
                                            <span className="flex flex-col gap-0.5 mt-1">
                                                {row.metDraainagel > 0 && (
                                                    <span className="text-green-600 flex items-center gap-1">
                                                        <span>✓</span> Met Draainagel ({row.metDraainagel})
                                                    </span>
                                                )}
                                                {row.zonderDraainagel > 0 && (
                                                    <span className="text-gray-500 flex items-center gap-1">
                                                        <span>✕</span> Zonder Draainagel ({row.zonderDraainagel})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </td>

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

                                    {/* Stock */}
                                    <td className="px-4 md:px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRemove(row); }}
                                                disabled={!!loading || row.inStock <= 0}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all font-bold"
                                            >
                                                -
                                            </button>
                                            <span className={clsx(
                                                "w-8 font-mono font-bold text-lg text-center",
                                                row.inStock <= (row.itemType?.min_stock_level || 0) && row.inStock > 0 ? "text-yellow-500" :
                                                    row.inStock === 0 ? "text-red-500" : "text-green-500"
                                            )}>
                                                {loading?.includes(`${row.name}-`) && !loading?.includes('-min-') ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : row.inStock}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAdd(row); }}
                                                disabled={!!loading}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-app-border hover:bg-app-bg text-app-text-primary disabled:opacity-30 transition-all font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>

                                    {/* Deployed */}
                                    <td className="px-4 md:px-6 py-4 text-center">
                                        <span className="text-blue-500 font-mono font-medium">{row.deployed}</span>
                                    </td>

                                    {/* Actions (Expand) */}
                                    <td className="px-4 md:px-6 py-4 text-right">
                                        <Pen className={clsx("w-4 h-4 ml-auto transition-transform", expandedRow === row.name && "rotate-90 text-blue-500")} />
                                    </td>
                                </tr>

                                {expandedRow === row.name && (
                                    <tr className="bg-app-bg/30 shadow-inner">
                                        <td colSpan={6} className="px-4 md:px-6 py-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-xs uppercase tracking-wider font-semibold text-app-text-secondary px-2">
                                                    <span>Individuele Kettingen</span>
                                                    <span>{row.assets.length} items</span>
                                                </div>
                                                <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-app-bg/50 text-app-text-secondary text-xs">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">Naam / ID</th>
                                                                <th className="px-4 py-2 text-left">Serienummer</th>
                                                                <th className="px-4 py-2 text-left">Status</th>
                                                                <th className="px-4 py-2 text-left">Draainagel</th>
                                                                <th className="px-4 py-2 text-left">Locatie</th>
                                                                <th className="px-4 py-2 text-left">Notities</th>
                                                                <th className="px-4 py-2 text-right">Actie</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-app-border/50">
                                                            {row.assets.map(asset => (
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
                                                                    <td className="px-4 py-3 text-xs">
                                                                        {asset.metadata?.swivel === 'Ja' ? '✅ Ja' : '❌ Nee'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-xs">
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
                                                                                    handleDeleteClick(asset.id);
                                                                                }}
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
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
                asset={{ category: 'Ketting' }}
                itemTypes={itemTypes.filter(t => {
                    // Always show standard types
                    const isStandard = CHAIN_TYPES.some(ct => ct.match === t.name);
                    // Show custom types only if they are in use (have assets)
                    const isInUse = assets.some(a => a.item_id === t.id);
                    return isStandard || isInUse;
                })}
            />

            {/* Delete Confirmation Dialog */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-app-surface border border-app-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-2">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-center text-app-text-primary">Ketting Verwijderen</h3>
                            <p className="text-center text-app-text-secondary">
                                Weet je zeker dat je dit item wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 px-4 py-2 rounded-xl border border-app-border font-semibold hover:bg-app-bg transition-colors"
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shadow-lg active:scale-95"
                            >
                                Verwijderen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
