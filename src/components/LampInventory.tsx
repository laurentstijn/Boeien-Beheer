'use client';

import { useState, useMemo, Fragment } from 'react';
import {
    Search,
    Filter,
    Plus,
    Edit2,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
    Bluetooth,
    BluetoothOff,
    Navigation,
    Loader2,
    MoreVertical,
    ChevronDown,
    ChevronRight,
    Zap,
    MapPin,
    Tag,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { deleteAsset, updateItemMinStock } from '@/app/actions';
import { AssetDialog } from './AssetDialog';
import { ConfirmDialog } from './ConfirmDialog';

interface LampInventoryProps {
    assets: any[];
    itemTypes: any[];
    buoys?: any[];
}

export function LampInventory({ assets, itemTypes, buoys = [] }: LampInventoryProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [loadingMin, setLoadingMin] = useState<string | null>(null);

    // Deletion confirmation state
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [assetToDeleteId, setAssetToDeleteId] = useState<string | null>(null);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    // Filter logic for individual assets
    const matchesSearchOnly = (asset: any) => {
        const search = searchTerm.toLowerCase();
        return !search ||
            (asset.item?.name?.toLowerCase() || '').includes(search) ||
            (asset.metadata?.article_number?.toLowerCase() || '').includes(search) ||
            (asset.metadata?.serialNumber?.toLowerCase() || '').includes(search) ||
            (asset.metadata?.serial_number?.toLowerCase() || '').includes(search) ||
            (asset.id?.slice(0, 8) || '').includes(search) ||
            (asset.metadata?.notes?.toLowerCase() || '').includes(search) ||
            (asset.metadata?.brand?.toLowerCase() || '').includes(search) ||
            (asset.metadata?.gps ? 'gps' : '').includes(search) ||
            (asset.metadata?.ble ? 'ble' : '').includes(search);
    };

    const matchesFilters = (asset: any) => {
        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
        return matchesSearchOnly(asset) && matchesStatus;
    };

    const normalizeColor = (colorStr: string | undefined, modelName: string | undefined = '') => {
        const lower = (colorStr || modelName || '').toLowerCase();
        if (lower.includes('blauw/geel') || lower.includes('yellow/blue') || lower.includes('blue/yellow')) return 'Blauw/Geel';
        if (lower.includes('geel') || lower.includes('yellow') || lower.match(/\by\b/)) return 'Geel';
        if (lower.includes('rood') || lower.includes('red') || lower.match(/\br\b/) || lower.includes('800r') || lower.includes('860r')) return 'Rood';
        if (lower.includes('groen') || lower.includes('green') || lower.match(/\bg\b/) || lower.includes('800g') || lower.includes('860g')) return 'Groen';
        if (lower.includes('wit') || lower.includes('white') || lower.match(/\bw\b/)) return 'Wit';
        return 'Geel'; // fallback for 'FL70' etc. which are yellow by default
    };

    const handleMinStockChange = async (group: any, change: number) => {
        if (!group || !group.mainItemType || !group.mainItemType.id || String(group.mainItemType.id).startsWith('custom-')) return;

        const currentMin = group.minStock || 0;
        const newMin = Math.max(0, currentMin + change);

        const id = `${group.id}-min-${change > 0 ? 'inc' : 'dec'}`;
        setLoadingMin(id);

        try {
            // Apply delta to the main itemType representing this color group
            const targetTypeCurrent = group.mainItemType.min_stock_level || 0;
            const targetTypeNew = Math.max(0, targetTypeCurrent + change);

            await updateItemMinStock(group.mainItemType.id, targetTypeNew);
            group.mainItemType.min_stock_level = targetTypeNew; // mutate local
            router.refresh();
        } finally {
            setLoadingMin(null);
        }
    };

    // Grouping assets purely by color
    const groupedRows = useMemo(() => {
        const colorGroups = new Map<string, {
            id: string; // The color exactly
            colorName: string;
            total: number;
            minStock: number;
            available: number;
            deployed: number;
            maintenance: number;
            broken: number;
            lost: number;
            matchingAssets: any[];
            allAssets: any[];
            mainItemType: any | null;
        }>();

        const colors = ['Geel', 'Rood', 'Groen', 'Wit', 'Blauw/Geel'];
        colors.forEach(c => {
            colorGroups.set(c, {
                id: c,
                colorName: c,
                total: 0, minStock: 0, available: 0, deployed: 0, maintenance: 0, broken: 0, lost: 0,
                matchingAssets: [], allAssets: [], mainItemType: null
            });
        });

        // 1. Group itemTypes by color to accumulate minStock & find a mutate target
        itemTypes.forEach(type => {
            const c = normalizeColor(type.name);
            const group = colorGroups.get(c);
            if (!group) return;

            group.minStock += (type.min_stock_level || 0);

            // Prefer the first itemType that doesn't scream 'custom'
            if (!group.mainItemType && type.id && !String(type.id).startsWith('custom-')) {
                group.mainItemType = type;
            }
        });

        // 2. Put assets in groups
        assets.forEach(asset => {
            const rawColor = asset.metadata?.color || asset.metadata?.lamp_color;
            const modelName = asset.item?.name || '';
            let c = normalizeColor(rawColor, modelName);

            const group = colorGroups.get(c) || colorGroups.get('Geel')!;

            group.allAssets.push(asset);

            if (matchesFilters(asset)) {
                group.matchingAssets.push(asset);
                group.total++;
                if (asset.status === 'in_stock') group.available++;
                if (asset.status === 'deployed') group.deployed++;
                if (asset.status === 'maintenance') group.maintenance++;
                if (asset.status === 'broken') group.broken++;
                if (asset.status === 'lost') group.lost++;
            }
        });

        return Array.from(colorGroups.values())
            .filter(g => g.matchingAssets.length > 0 || searchTerm.length === 0)
            .sort((a, b) => a.colorName.localeCompare(b.colorName));
    }, [assets, itemTypes, searchTerm, statusFilter]);

    // Stats for summary cards (calculated over all search-matching assets, ignoring statusFilter)
    const stats = useMemo(() => {
        const flatMatching = assets.filter(matchesSearchOnly);
        return {
            available: flatMatching.filter((a: any) => a.status === 'in_stock').length,
            deployed: flatMatching.filter((a: any) => a.status === 'deployed').length,
            maintenance: flatMatching.filter((a: any) => a.status === 'maintenance').length,
            defect: flatMatching.filter((a: any) => a.status === 'broken').length,
            lost: flatMatching.filter((a: any) => a.status === 'lost').length,
        };
    }, [assets, searchTerm]);

    const handleEdit = (asset: any) => {
        setSelectedAsset(asset);
        setDialogMode('edit');
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedAsset({ category: 'Lamp' });
        setDialogMode('create');
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        setAssetToDeleteId(id);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!assetToDeleteId) return;
        const result = await deleteAsset(assetToDeleteId);
        if (result && !result.success) {
            alert(result.message);
        }
        setAssetToDeleteId(null);
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'in_stock':
                return { label: 'Beschikbaar', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2 };
            case 'deployed':
                return { label: 'Uitgelegd', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Zap };
            case 'maintenance':
                return { label: 'Onderhoud', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Clock };
            case 'broken':
                return { label: 'Defect', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle };
            case 'lost':
                return { label: 'Verloren', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: AlertCircle };
            default:
                return { label: status, color: 'text-gray-500', bg: 'bg-gray-500/10', icon: AlertCircle };
        }
    };

    const getColorDot = (color: string) => {
        const lower = color?.toLowerCase() || '';
        if (lower.includes('blauw/geel')) return 'bg-gradient-to-r from-blue-500 to-yellow-400';
        if (lower.includes('geel')) return 'bg-yellow-400';
        if (lower.includes('rood')) return 'bg-red-500';
        if (lower.includes('groen')) return 'bg-green-500';
        if (lower.includes('wit')) return 'bg-white border border-gray-200';
        return 'bg-yellow-400';
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { key: 'in_stock', count: stats.available, label: 'Beschikbaar', sub: 'In magazijn', icon: CheckCircle2, color: 'green' },
                    { key: 'deployed', count: stats.deployed, label: 'Uitgelegd', sub: 'In water', icon: Zap, color: 'blue' },
                    { key: 'maintenance', count: stats.maintenance, label: 'Stuk', sub: 'Teruggebracht', icon: Clock, color: 'orange' },
                    { key: 'lost', count: stats.lost, label: 'Kwijt', sub: 'Verloren', icon: AlertCircle, color: 'red' },
                ].map(({ key, count, label, sub, icon: Icon, color }) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                        className={clsx(
                            'bg-app-surface border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md text-left',
                            statusFilter === key
                                ? `border-${color}-400 ring-2 ring-${color}-300`
                                : 'border-app-border hover:border-app-border'
                        )}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2.5 bg-${color}-500/10 rounded-xl`}>
                                <Icon className={`w-6 h-6 text-${color}-500`} />
                            </div>
                            <span className="text-sm font-medium text-app-text-secondary">{label}</span>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-app-text-primary">{count}</div>
                            <div className={`text-sm font-medium text-${color}-500 mt-0.5`}>{sub}</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-app-surface p-4 border border-app-border rounded-2xl shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-secondary" />
                    <input
                        type="text"
                        placeholder="Zoek obv serie nummer, merk of notities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-app-bg border border-app-border rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-app-text-secondary hover:text-app-text-primary transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-app-bg border border-app-border rounded-xl px-2 py-1 overflow-x-auto">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                                statusFilter === 'all' ? "bg-white shadow-sm text-blue-600" : "text-app-text-secondary hover:text-app-text-primary"
                            )}
                        >
                            Alle
                        </button>
                        <button
                            onClick={() => setStatusFilter('in_stock')}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                                statusFilter === 'in_stock' ? "bg-white shadow-sm text-green-600" : "text-app-text-secondary hover:text-app-text-primary"
                            )}
                        >
                            Beschikbaar
                        </button>
                        <button
                            onClick={() => setStatusFilter('deployed')}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                                statusFilter === 'deployed' ? "bg-white shadow-sm text-blue-600" : "text-app-text-secondary hover:text-app-text-primary"
                            )}
                        >
                            Uitgelegd
                        </button>
                    </div>

                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Nieuwe Lamp
                    </button>
                </div>
            </div>

            {/* Hierarchical Table */}
            <div className="bg-app-surface border border-app-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-app-bg/50 border-b border-app-border">
                                <th className="px-6 py-4 text-xs font-bold text-app-text-secondary uppercase tracking-wider w-10"></th>
                                <th className="px-6 py-4 text-xs font-bold text-app-text-secondary uppercase tracking-wider">Kleur</th>
                                <th className="px-6 py-4 text-xs font-bold text-app-text-secondary uppercase tracking-wider text-center">Min.</th>
                                <th className="px-6 py-4 text-xs font-bold text-app-text-secondary uppercase tracking-wider text-center">Totaal Filtered</th>
                                <th className="px-6 py-4 text-xs font-bold text-app-text-secondary uppercase tracking-wider text-center">Beschikbaar</th>
                                <th className="px-6 py-4 text-xs font-bold text-app-text-secondary uppercase tracking-wider text-center">Uitgelegd</th>
                                <th className="px-6 py-4 text-xs font-bold text-app-text-secondary uppercase tracking-wider text-right">Acties</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                            {groupedRows.length > 0 ? (
                                groupedRows.map((group) => {
                                    const isExpanded = expandedGroups.has(group.id);
                                    const minStock = group.minStock;
                                    const isLowStock = group.available <= minStock;

                                    return (
                                        <Fragment key={group.id}>
                                            {/* Parent Row */}
                                            <tr
                                                className={clsx("hover:bg-app-surface-hover transition-colors group cursor-pointer", isExpanded && "bg-app-surface-hover")}
                                                onClick={() => toggleGroup(group.id)}
                                            >
                                                <td className="px-6 py-4">
                                                    <ChevronRight className={clsx("w-5 h-5 text-app-text-secondary transition-transform", isExpanded && "rotate-90")} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={clsx("w-4 h-4 rounded-full shadow-sm", getColorDot(group.colorName))} />
                                                        <span className="font-bold text-app-text-primary text-sm">{group.colorName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMinStockChange(group, -1); }}
                                                            disabled={!!loadingMin || !group.mainItemType?.id || minStock <= 0}
                                                            className="w-5 h-5 flex items-center justify-center rounded border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all font-mono text-xs"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-4 text-center font-mono font-medium text-xs text-app-text-secondary">
                                                            {loadingMin?.includes(`${group.id}-min-`) ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : minStock}
                                                        </span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMinStockChange(group, 1); }}
                                                            disabled={!!loadingMin || !group.mainItemType?.id}
                                                            className="w-5 h-5 flex items-center justify-center rounded border border-app-border hover:bg-app-bg text-app-text-secondary disabled:opacity-30 transition-all font-mono text-xs"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono font-bold text-lg text-app-text-primary">
                                                    {group.total}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono font-bold text-lg">
                                                    <span className={clsx(
                                                        isLowStock && group.available > 0 ? "text-yellow-500" :
                                                            group.available === 0 ? "text-red-500" : "text-green-500"
                                                    )}>
                                                        {group.available}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono font-bold text-app-text-secondary">
                                                    {group.deployed}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs text-app-text-secondary mr-2">
                                                        {group.matchingAssets.length} items
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Children Rows */}
                                            {isExpanded && (
                                                <tr className="bg-app-bg/30 shadow-inner">
                                                    <td colSpan={7} className="px-4 py-4">
                                                        <div className="p-4 bg-app-surface border border-app-border rounded-xl">
                                                            {group.matchingAssets.length > 0 ? (
                                                                <table className="w-full text-left text-sm">
                                                                    <thead>
                                                                        <tr className="text-app-text-secondary border-b border-app-border/50">
                                                                            <th className="pb-2 font-medium">Serienummer</th>
                                                                            <th className="pb-2 font-medium">Model</th>
                                                                            <th className="pb-2 font-medium">Locatie</th>
                                                                            <th className="pb-2 font-medium">Status</th>
                                                                            <th className="pb-2 font-medium text-center">BLE/GPS</th>
                                                                            <th className="pb-2 font-medium">Notities</th>
                                                                            <th className="pb-2 text-right">Acties</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-app-border/30">
                                                                        {group.matchingAssets.map(asset => {
                                                                            const statusInfo = getStatusInfo(asset.status);
                                                                            const StatusIcon = statusInfo.icon;
                                                                            const serialNumber = asset.metadata?.serialNumber || asset.metadata?.serial_number || asset.metadata?.article_number || asset.id.slice(0, 8);
                                                                            const brandName = asset.metadata?.brand || asset.metadata?.manufacturer || '';
                                                                            const typeName = asset.item?.name || asset.metadata?.type || asset.metadata?.model || '';
                                                                            const specificModel = brandName && typeName && !typeName.toLowerCase().includes(brandName.toLowerCase())
                                                                                ? `${brandName} ${typeName}`
                                                                                : (typeName || brandName || 'Onbekend Lamp Model');

                                                                            return (
                                                                                <tr key={asset.id} className="hover:bg-app-surface-hover/50 group/child transition-colors">
                                                                                    <td className="py-3">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Tag className="w-3.5 h-3.5 text-blue-500" />
                                                                                            <span className="font-bold text-app-text-primary">{serialNumber}</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-3">
                                                                                        <span className="text-app-text-secondary">{specificModel}</span>
                                                                                    </td>
                                                                                    <td className="py-3">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <MapPin className="w-3.5 h-3.5 text-app-text-secondary" />
                                                                                            {asset.status === 'deployed' && asset.deployment_id ? (
                                                                                                <span className="font-medium">
                                                                                                    {buoys.find(b => b.id === asset.deployment_id)?.name || asset.location || 'Onbekend'}
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="text-app-text-secondary italic">
                                                                                                    {asset.location || 'Magazijn'}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-3">
                                                                                        <div className={clsx(
                                                                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold",
                                                                                            statusInfo.bg,
                                                                                            statusInfo.color
                                                                                        )}>
                                                                                            <StatusIcon className="w-3 h-3" />
                                                                                            {statusInfo.label}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-3 text-center">
                                                                                        <div className="flex items-center justify-center gap-2">
                                                                                            {asset.metadata?.ble ? <span title="BLE Geactiveerd"><Bluetooth className="w-3.5 h-3.5 text-blue-500" /></span> : <BluetoothOff className="w-3 h-3 text-gray-400 opacity-20" />}
                                                                                            {asset.metadata?.gps ? <span title="GPS Geactiveerd"><Navigation className="w-3.5 h-3.5 text-indigo-500" /></span> : <Navigation className="w-3 h-3 text-gray-400 opacity-20" />}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="py-3 text-app-text-secondary w-1/4">
                                                                                        <span className="line-clamp-1">{asset.metadata?.notes || '-'}</span>
                                                                                    </td>
                                                                                    <td className="py-3 text-right">
                                                                                        <div className="flex items-center justify-end gap-1 opacity-20 group-hover/child:opacity-100 transition-opacity">
                                                                                            <button
                                                                                                onClick={() => handleEdit(asset)}
                                                                                                className="p-1.5 text-app-text-secondary hover:text-blue-500 hover:bg-blue-500/10 rounded transition-all"
                                                                                                title="Edit"
                                                                                            >
                                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleDelete(asset.id)}
                                                                                                disabled={asset.status === 'deployed'}
                                                                                                className={clsx(
                                                                                                    "p-1.5 rounded transition-all",
                                                                                                    asset.status === 'deployed'
                                                                                                        ? "text-gray-300 cursor-not-allowed"
                                                                                                        : "text-app-text-secondary hover:text-red-500 hover:bg-red-500/10"
                                                                                                )}
                                                                                                title={asset.status === 'deployed' ? "Ontkoppel eerst overal" : "Delete"}
                                                                                            >
                                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <div className="text-center py-4 text-app-text-secondary italic">Geen items matchen in deze groep.</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-app-text-secondary italic bg-app-bg/10">
                                        Geen lampen gevonden die voldoen aan de zoekcriteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AssetDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                mode={dialogMode}
                asset={selectedAsset}
                itemTypes={itemTypes}
                buoys={buoys}
            />

            <ConfirmDialog
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Lamp Verwijderen"
                message="Weet je zeker dat je deze lamp wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
                confirmLabel="Verwijderen"
                variant="danger"
            />
        </div>
    );
}
