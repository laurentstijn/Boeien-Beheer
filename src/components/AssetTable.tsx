"use client";

import { Package, Search, Plus, Pencil, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { deleteAsset } from "@/app/actions";
import { AssetDialog } from "./AssetDialog";
import { ChainIcon } from "./ChainIcon";
import { StoneIcon } from "./StoneIcon";
import { BuoyIcon } from "./BuoyIcon";
import { ConfirmDialog } from "./ConfirmDialog";

interface Asset {
    id: string;
    name: string;
    category: string;
    status: string;
    location: string;
    details: string;
    deployment_id?: string;
    metadata: any;
}

interface ItemType {
    id: string;
    name: string;
}

interface AssetTableProps {
    assets: Asset[];
    title: string;
    types?: ItemType[];
    buoys?: any[];
}

export function AssetTable({ assets, title, types = [], showSwivel = true, buoys = [] }: AssetTableProps & { showSwivel?: boolean }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");

    // Deletion confirmation state
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [assetToDeleteId, setAssetToDeleteId] = useState<string | null>(null);

    const handleCreate = () => {
        setDialogMode('create');
        setSelectedAsset(undefined);
        setIsDialogOpen(true);
    };

    const handleEdit = (asset: Asset) => {
        setDialogMode('edit');
        setSelectedAsset(asset);
        setIsDialogOpen(true);
    };

    const filteredAssets = assets.filter(asset => {
        const searchStr = searchQuery.toLowerCase();
        const swivelStatus = (asset.metadata?.swivel || 'Nee').toLowerCase();
        const hasChainStatus = (asset.metadata?.hasChain ? 'met ketting' : 'zonder ketting').toLowerCase();

        return (
            asset.name.toLowerCase().includes(searchStr) ||
            asset.id.toLowerCase().includes(searchStr) ||
            asset.status.toLowerCase().includes(searchStr) ||
            (asset.metadata?.notes || '').toLowerCase().includes(searchStr) ||
            (asset.metadata?.article_number || '').toLowerCase().includes(searchStr) ||
            swivelStatus.includes(searchStr) ||
            (searchStr === 'ja' && swivelStatus === 'ja') ||
            (searchStr === 'draainagel' && swivelStatus === 'ja') ||
            hasChainStatus.includes(searchStr)
        );
    });

    const handleDelete = (id: string) => {
        setAssetToDeleteId(id);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!assetToDeleteId) return;
        const result = await deleteAsset(assetToDeleteId);
        if (result && !result.success) {
            alert(result.message);
        } else {
            window.location.reload();
        }
        setAssetToDeleteId(null);
    };

    // Sorting logic
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedAssets = [...filteredAssets].sort((a, b) => {
        if (!sortConfig) return 0;

        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
            case 'item':
                aValue = a.name.replace('Ketting ', '');
                bValue = b.name.replace('Ketting ', '');
                break;
            case 'name':
                aValue = a.name;
                bValue = b.name;
                break;
            case 'article_number':
                aValue = a.metadata?.article_number || '';
                bValue = b.metadata?.article_number || '';
                break;
            case 'location':
                aValue = a.location;
                bValue = b.location;
                break;
            case 'swivel':
                if (a.category === 'Steen') {
                    aValue = a.metadata?.hasChain ? 'Ja' : 'Nee';
                    bValue = b.metadata?.hasChain ? 'Ja' : 'Nee';
                } else {
                    aValue = a.metadata?.swivel || 'Nee';
                    bValue = b.metadata?.swivel || 'Nee';
                }
                break;
            case 'notes':
                aValue = a.metadata?.notes || '';
                bValue = b.metadata?.notes || '';
                break;
            case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (!sortConfig || sortConfig.key !== columnKey) return <div className="w-4 h-4" />; // Placeholder
        return sortConfig.direction === 'asc' ? (
            <span className="text-blue-500">▲</span> // Simple arrow or use lucide ChevronUp
        ) : (
            <span className="text-blue-500">▼</span>
        );
    };

    // Helper for header cell
    const HeaderCell = ({ label, sortKey, className = "" }: { label: string, sortKey: string, className?: string }) => (
        <th
            className={clsx("px-6 py-4 cursor-pointer hover:bg-app-surface-hover hover:text-app-text-primary transition-colors select-none", className)}
            onClick={() => handleSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                {label}
                <SortIcon columnKey={sortKey} />
            </div>
        </th>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-app-text-secondary" />
                    <h2 className="text-xl font-semibold text-app-text-primary">{title}</h2>
                    <span className="bg-app-surface border border-app-border text-app-text-secondary px-2 py-0.5 rounded-full text-xs font-bold">
                        {assets.length} items
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative">
                        <Search className="w-4 h-4 text-app-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Zoeken..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-app-surface border border-app-border rounded-lg pl-9 pr-10 py-2 text-sm text-app-text-primary focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-secondary hover:text-app-text-primary transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleCreate}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nieuw Asset
                    </button>
                </div>
            </div>

            <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto"> {/* Added overflow wrapper for small screens */}
                    <table className="w-full text-left text-sm text-app-text-secondary">
                        <thead className="bg-app-surface border-b border-app-border text-app-text-primary font-medium uppercase text-xs">
                            <tr>
                                <HeaderCell label="Item" sortKey="item" className="w-16" />
                                <HeaderCell label="Naam" sortKey="name" />
                                <HeaderCell label="Artikel Nr" sortKey="article_number" />
                                <HeaderCell label="Locatie" sortKey="location" />
                                {showSwivel && <HeaderCell label={assets[0]?.category === 'Steen' ? 'Ketting' : 'Draainagel'} sortKey="swivel" className="text-center" />}
                                <HeaderCell label="Notities" sortKey="notes" />
                                <HeaderCell label="Status" sortKey="status" />
                                <th className="px-6 py-4 text-right">Acties</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                            {sortedAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-app-text-secondary italic">
                                        Geen assets gevonden.
                                    </td>
                                </tr>
                            ) : (
                                sortedAssets.map((asset) => {
                                    // Logic for loop:
                                    return (
                                        <tr key={asset.id} className="hover:bg-app-surface-hover/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="w-8 h-8 rounded-full bg-app-bg border border-app-border flex items-center justify-center">
                                                    {asset.category === 'Steen' && asset.metadata?.shape ? (
                                                        <StoneIcon shape={asset.metadata.shape} size="sm" />
                                                    ) : asset.category === 'Boei' && asset.metadata?.color ? (
                                                        <BuoyIcon color={asset.metadata.color} size="sm" />
                                                    ) : asset.category === 'Ketting' ? (
                                                        <ChainIcon color={asset.name.replace('Ketting ', '')} size="sm" />
                                                    ) : (
                                                        <Package className="w-4 h-4 text-app-text-secondary" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-app-text-primary">
                                                {/* For stones, show weight + shape instead of full name */}
                                                {asset.category === 'Steen' && asset.metadata?.weight && asset.metadata?.shape
                                                    ? `${asset.metadata.weight} ton ${asset.metadata.shape}`
                                                    : asset.category === 'Boei' && asset.metadata?.model && asset.metadata?.color
                                                        ? `${asset.metadata.model} ${asset.metadata.color}`
                                                        : asset.name
                                                }
                                                <div className="text-[11px] text-app-text-secondary font-normal italic opacity-80 mt-0.5">
                                                    {asset.category === 'Ketting'
                                                        ? `${asset.details.replace(', Met draainagel', '').replace(', Zonder draainagel', '')}${asset.metadata?.swivel === 'Ja' ? ', Met draainagel' : ', Zonder draainagel'}`
                                                        : asset.category === 'Steen'
                                                            ? `${asset.details}${asset.metadata?.hasChain ? ', Met ketting' : ', Zonder ketting'}`
                                                            : asset.details
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-[11px] text-app-text-secondary">
                                                {asset.metadata?.article_number || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-app-text-primary">{asset.location}</td>
                                            {showSwivel && (
                                                <td className="px-6 py-4 text-center">
                                                    {asset.category === 'Steen' ? (
                                                        asset.metadata?.hasChain ? (
                                                            <span className="text-blue-500 font-bold">Ja</span>
                                                        ) : (
                                                            <span className="text-app-text-secondary opacity-40">Nee</span>
                                                        )
                                                    ) : (
                                                        asset.metadata?.swivel === 'Ja' ? (
                                                            <span className="text-blue-500 font-bold">Ja</span>
                                                        ) : (
                                                            <span className="text-app-text-secondary opacity-40">Nee</span>
                                                        )
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 max-w-xs truncate" title={asset.metadata?.notes}>
                                                {asset.metadata?.notes || '-'}
                                            </td>
                                            <td className="px-6 py-4 lowercase">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-[10px] font-bold tracking-wider",
                                                    asset.status === "in_stock" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                                                )}>
                                                    {asset.status === "in_stock" ? "Voorraad" : "Uitlegd"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleEdit(asset)}
                                                    className="p-2 hover:bg-app-surface-hover rounded-lg text-app-text-secondary hover:text-app-text-primary transition-colors inline-block shadow-sm mr-1"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(asset.id)}
                                                    disabled={asset.status === "deployed" || !!asset.deployment_id}
                                                    className={clsx(
                                                        "p-2 rounded-lg transition-colors inline-block shadow-sm",
                                                        (asset.status === "deployed" || !!asset.deployment_id)
                                                            ? "text-app-text-secondary/20 cursor-not-allowed"
                                                            : "text-app-text-secondary hover:bg-red-500/10 hover:text-red-500"
                                                    )}
                                                    title={(asset.status === "deployed" || !!asset.deployment_id) ? "Ontkoppel dit item eerst om te kunnen verwijderen" : "Verwijderen"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isDialogOpen && (
                <AssetDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    mode={dialogMode}
                    asset={selectedAsset}
                    itemTypes={types}
                    buoys={buoys}
                />
            )}

            <ConfirmDialog
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Item Verwijderen"
                message="Weet je zeker dat je dit item wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
                confirmLabel="Verwijderen"
                variant="danger"
            />
        </div>
    );
}
