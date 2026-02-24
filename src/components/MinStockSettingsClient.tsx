'use client';

import { useState, useTransition } from 'react';
import { updateItemMinStock, deleteItemType, deleteItemTypesBulk } from '@/app/actions';
import { AlertTriangle, Check, Loader2, Trash2, X } from 'lucide-react';
import clsx from 'clsx';

interface ItemRow {
    id: string;
    name: string;
    category: string;
    minStock: number;
    inStock: number;
    deployed: number;
    maintenance: number;
    status: 'ok' | 'low' | 'out';
}

const CATEGORY_LABELS: Record<string, string> = {
    Boei: 'Boeien',
    Ketting: 'Kettingen',
    Steen: 'Stenen',
    Lamp: 'Lampen',
    Topteken: 'Toptekens',
    Sluiting: 'Sluitingen',
    Zinkblok: 'Zinkblokken',
    Structuur: 'Structuren',
    Opslag: 'Opslag',
};

export function MinStockSettingsClient({ items: initialItems }: { items: ItemRow[] }) {
    const [items, setItems] = useState<ItemRow[]>(initialItems);
    const [minValues, setMinValues] = useState<Record<string, number>>(
        Object.fromEntries(initialItems.map(i => [i.id, i.minStock]))
    );
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [isPending, startTransition] = useTransition();

    // Unused items = 0 in_stock, 0 deployed, 0 maintenance
    const unusedItems = items.filter(i => i.inStock === 0 && i.deployed === 0 && i.maintenance === 0);

    // Group items by category
    const byCategory: Record<string, ItemRow[]> = {};
    items.forEach(item => {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
    });

    const showStatus = (text: string, ok: boolean) => {
        setStatusMsg({ text, ok });
        setTimeout(() => setStatusMsg(null), 3000);
    };

    const handleSave = (itemId: string) => {
        setSavingId(itemId);
        startTransition(async () => {
            await updateItemMinStock(itemId, minValues[itemId] ?? 0);
            setSavingId(null);
            setSavedId(itemId);
            setTimeout(() => setSavedId(null), 2000);
        });
    };

    const handleDelete = async (itemId: string) => {
        setDeletingId(itemId);
        setConfirmDeleteId(null);
        const result = await deleteItemType(itemId);
        setDeletingId(null);
        if (result.success) {
            setItems(prev => prev.filter(i => i.id !== itemId));
            showStatus('Articletype verwijderd.', true);
        } else {
            showStatus(result.message || 'Fout bij verwijderen.', false);
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        setShowBulkConfirm(false);
        const ids = unusedItems.map(i => i.id);
        const result = await deleteItemTypesBulk(ids);
        setIsBulkDeleting(false);
        if (result.success) {
            setItems(prev => prev.filter(i => i.inStock > 0 || i.deployed > 0 || i.maintenance > 0));
            showStatus(result.message || 'Verwijderd.', true);
        } else {
            showStatus(result.message || 'Fout bij verwijderen.', false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Bulk cleanup banner */}
            {unusedItems.length > 0 && (
                <div className="flex items-center justify-between bg-orange-500/5 border border-orange-500/20 rounded-2xl px-5 py-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-app-text-primary text-sm">
                                {unusedItems.length} artikeltypes hebben geen voorraad of gebruik
                            </p>
                            <p className="text-xs text-app-text-secondary mt-0.5">
                                Je kunt ze in bulk verwijderen (test-types, lege types, etc.)
                            </p>
                        </div>
                    </div>
                    {!showBulkConfirm ? (
                        <button
                            onClick={() => setShowBulkConfirm(true)}
                            disabled={isBulkDeleting}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Alles verwijderen
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-app-text-secondary">Zeker weten?</p>
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                            >
                                Ja, verwijder {unusedItems.length}
                            </button>
                            <button
                                onClick={() => setShowBulkConfirm(false)}
                                className="px-3 py-1.5 rounded-lg border border-app-border text-app-text-secondary text-sm hover:bg-app-surface-hover transition-colors"
                            >
                                Annuleer
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Status message toast */}
            {statusMsg && (
                <div className={clsx(
                    "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                    statusMsg.ok
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                    {statusMsg.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {statusMsg.text}
                </div>
            )}

            {/* Per-category tables */}
            {Object.entries(byCategory).map(([category, categoryItems]) => (
                <div key={category} className="bg-app-surface rounded-2xl border border-app-border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-app-border bg-app-bg/40 flex items-center justify-between">
                        <h2 className="font-bold text-app-text-primary">{CATEGORY_LABELS[category] || category}</h2>
                        <span className="text-[10px] font-bold text-app-text-secondary/40 uppercase tracking-widest">{categoryItems.length} types</span>
                    </div>
                    <div className="divide-y divide-app-border/40">
                        {categoryItems.map(item => {
                            const currentMin = minValues[item.id] ?? 0;
                            const isDirty = currentMin !== item.minStock;
                            const isSaving = savingId === item.id;
                            const isSaved = savedId === item.id;
                            const isDeleting = deletingId === item.id;
                            const confirmingDelete = confirmDeleteId === item.id;
                            const isUnused = item.inStock === 0 && item.deployed === 0 && item.maintenance === 0;

                            return (
                                <div key={item.id} className={clsx(
                                    "flex items-center gap-4 px-6 py-3 transition-colors",
                                    isUnused ? "opacity-60 hover:opacity-100" : "hover:bg-app-surface-hover/30"
                                )}>
                                    {/* Status dot */}
                                    <div className={clsx(
                                        "w-2 h-2 rounded-full flex-shrink-0",
                                        item.status === 'ok' && "bg-green-500",
                                        item.status === 'low' && "bg-yellow-400",
                                        item.status === 'out' && item.minStock > 0 && "bg-red-500",
                                        item.status === 'out' && item.minStock === 0 && "bg-gray-300",
                                    )} />

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-app-text-primary truncate">{item.name}</p>
                                        <p className="text-[11px] text-app-text-secondary/60">
                                            In opslag: <span className={clsx(
                                                "font-bold",
                                                item.status === 'ok' ? "text-green-500" :
                                                    item.status === 'low' ? "text-yellow-400" :
                                                        item.minStock > 0 ? "text-red-500" : "text-app-text-secondary"
                                            )}>{item.inStock}</span>
                                            {item.deployed > 0 && <span className="ml-2 text-blue-500">{item.deployed} uitgelegd</span>}
                                            {item.maintenance > 0 && <span className="ml-2 text-orange-500">{item.maintenance} onderhoud</span>}
                                        </p>
                                    </div>

                                    {/* Delete confirmation inline */}
                                    {confirmingDelete ? (
                                        <div className="flex items-center gap-2 ml-auto">
                                            <span className="text-xs text-app-text-secondary">Verwijderen?</span>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                                            >
                                                Ja
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-2 py-1 rounded-lg border border-app-border text-app-text-secondary text-xs hover:bg-app-surface-hover transition-colors"
                                            >
                                                Nee
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Min stock input */}
                                            <div className="flex items-center gap-2">
                                                <label className="text-[11px] font-bold text-app-text-secondary/50 uppercase tracking-wider whitespace-nowrap">
                                                    Min.
                                                </label>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setMinValues(v => ({ ...v, [item.id]: Math.max(0, (v[item.id] ?? 0) - 1) }))}
                                                        className="w-7 h-7 rounded-lg border border-app-border hover:bg-app-bg text-app-text-secondary flex items-center justify-center text-sm font-bold transition-colors"
                                                    >−</button>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={minValues[item.id] ?? 0}
                                                        onChange={e => setMinValues(v => ({ ...v, [item.id]: parseInt(e.target.value) || 0 }))}
                                                        className="w-12 text-center bg-app-bg border border-app-border rounded-lg py-1 text-sm font-mono font-bold text-app-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                    />
                                                    <button
                                                        onClick={() => setMinValues(v => ({ ...v, [item.id]: (v[item.id] ?? 0) + 1 }))}
                                                        className="w-7 h-7 rounded-lg border border-app-border hover:bg-app-bg text-app-text-primary flex items-center justify-center text-sm font-bold transition-colors"
                                                    >+</button>
                                                </div>

                                                {/* Save button */}
                                                <button
                                                    onClick={() => handleSave(item.id)}
                                                    disabled={!isDirty || isSaving}
                                                    className={clsx(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                        isSaved && "bg-green-500/10 text-green-500 border border-green-500/20",
                                                        isDirty && !isSaved && !isSaving && "bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20",
                                                        !isDirty && !isSaved && "border border-transparent text-app-text-disabled opacity-30 cursor-not-allowed",
                                                        isSaving && "border border-app-border text-app-text-disabled"
                                                    )}
                                                    title="Opslaan"
                                                >
                                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>

                                            {/* Delete button (only if unused) */}
                                            {isUnused && (
                                                <button
                                                    onClick={() => setConfirmDeleteId(item.id)}
                                                    disabled={isDeleting}
                                                    className="w-8 h-8 rounded-lg border border-app-border/50 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 text-app-text-secondary/40 flex items-center justify-center transition-all"
                                                    title="Verwijder articletype"
                                                >
                                                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </button>
                                            )}

                                            {/* Low stock warning icon */}
                                            {item.status !== 'ok' && item.minStock > 0 && (
                                                <AlertTriangle className={clsx(
                                                    "w-4 h-4 flex-shrink-0",
                                                    item.status === 'low' ? "text-yellow-400" : "text-red-500"
                                                )} />
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
