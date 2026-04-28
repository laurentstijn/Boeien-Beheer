"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Hammer, Anchor, Link, Lightbulb, MapPin, AlertTriangle, CheckCircle, ChevronDown, Search, ShieldCheck, Layers, Ship } from 'lucide-react';
import { DeployedBuoy, InventoryItem } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { LightCharacterInput } from '@/components/LightCharacterInput';

// Generate URLs for waterinfo iframes
import { getInventoryItems } from '@/lib/db';
import AssetPicker from './AssetPicker';
import { AssetDialog } from './AssetDialog';
import { ConfirmDialog } from './ConfirmDialog';
import clsx from 'clsx';




interface MaintenanceDialogProps {
    buoy: DeployedBuoy;
    onClose: () => void;
    onUpdate: (updatedBuoy: DeployedBuoy) => void;
    onEdit?: () => void;
    logToEdit?: any; // Optional log entry to edit
}

export default function MaintenanceDialog({
    buoy,
    onClose,
    onUpdate,
    onEdit,
    logToEdit
}: MaintenanceDialogProps) {
    const isEditingHistory = !!logToEdit;
    const [technician, setTechnician] = useState(logToEdit?.technician || '');
    const [date, setDate] = useState(logToEdit?.service_date || '');
    const [notes, setNotes] = useState(logToEdit?.notes || logToEdit?.description || '');
    const [tideRestriction, setTideRestriction] = useState(logToEdit?.metadata?.tide_restriction || buoy.tideRestriction || 'Altijd');
    const [lightCharacter, setLightCharacter] = useState(logToEdit?.metadata?.light_character || buoy.lightCharacter || '');
    const [buoyCleaned, setBuoyCleaned] = useState(logToEdit?.metadata?.buoy_cleaned || false);
    const [lightTested, setLightTested] = useState(logToEdit?.metadata?.light_tested || false);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // New Part Creation State
    const [creationCategory, setCreationCategory] = useState<string | null>(null);
    const [creationItemTypes, setCreationItemTypes] = useState<any[]>([]);

    // Tide Data State
    const [tideData, setTideData] = useState<any>(null);
    const [isLoadingTide, setIsLoadingTide] = useState(false);
    const [showRawTideData, setShowRawTideData] = useState(false);

    // Date initialization on client to avoid hydration mismatch
    useEffect(() => {
        if (!logToEdit) {
            const today = new Date().toISOString().split('T')[0];
            setDate(today);
        }
    }, [logToEdit]);

    // Replacement State
    const [replaceChain, setReplaceChain] = useState(!!logToEdit?.metadata?.chain);
    const [replaceLight, setReplaceLight] = useState(!!logToEdit?.metadata?.light);
    const [replaceSinker, setReplaceSinker] = useState(!!logToEdit?.metadata?.sinker);
    const [replaceShackle, setReplaceShackle] = useState(!!logToEdit?.metadata?.shackle);
    const [replaceZinc, setReplaceZinc] = useState(!!logToEdit?.metadata?.zinc);
    const [replaceBuoy, setReplaceBuoy] = useState(!!logToEdit?.metadata?.buoy);

    // Available Inventory
    const [availableChains, setAvailableChains] = useState<InventoryItem[]>([]);
    const [availableLights, setAvailableLights] = useState<InventoryItem[]>([]);
    const [availableSinkers, setAvailableSinkers] = useState<InventoryItem[]>([]);
    const [availableShackles, setAvailableShackles] = useState<InventoryItem[]>([]);
    const [availableZincs, setAvailableZincs] = useState<InventoryItem[]>([]);
    const [availableBuoys, setAvailableBuoys] = useState<InventoryItem[]>([]);

    const [selectedChainId, setSelectedChainId] = useState(logToEdit?.metadata?.chain || '');
    const [selectedLightId, setSelectedLightId] = useState(logToEdit?.metadata?.light || '');
    const [selectedSinkerId, setSelectedSinkerId] = useState(logToEdit?.metadata?.sinker || '');
    const [shackleReplacements, setShackleReplacements] = useState<{ id: string, assetId: string, oldStatus: 'broken' | 'lost' }[]>(() => {
        if (logToEdit?.metadata?.shackles && Array.isArray(logToEdit.metadata.shackles)) {
            return logToEdit.metadata.shackles.map((s: any) => ({
                id: Math.random().toString(36).substring(7),
                assetId: s.assetId || s.asset_id || '',
                oldStatus: s.oldStatus || (s.lost ? 'lost' : 'broken')
            }));
        } else if (logToEdit?.metadata?.shackle) {
            return [{
                id: Math.random().toString(36).substring(7),
                assetId: logToEdit.metadata.shackle || '',
                oldStatus: logToEdit.metadata.shackle_lost ? 'lost' : 'broken'
            }];
        }
        return [{ id: Math.random().toString(36).substring(7), assetId: '', oldStatus: 'broken' }];
    });
    const [selectedZincId, setSelectedZincId] = useState(logToEdit?.metadata?.zinc || '');
    const [selectedBuoyId, setSelectedBuoyId] = useState(logToEdit?.metadata?.buoy || '');

    // Old Status: 'broken' (Stuk) or 'lost' (Kwijt)
    const [chainOldStatus, setChainOldStatus] = useState<'broken' | 'lost'>(logToEdit?.metadata?.chain_lost ? 'lost' : 'broken');
    const [lightOldStatus, setLightOldStatus] = useState<'broken' | 'lost'>(logToEdit?.metadata?.light_lost ? 'lost' : 'broken');
    const [sinkerOldStatus, setSinkerOldStatus] = useState<'broken' | 'lost'>(logToEdit?.metadata?.sinker_lost ? 'lost' : 'broken');
    const [zincOldStatus, setZincOldStatus] = useState<'broken' | 'lost'>(logToEdit?.metadata?.zinc_lost ? 'lost' : 'broken');
    const [buoyOldStatus, setBuoyOldStatus] = useState<'broken' | 'lost'>(logToEdit?.metadata?.buoy_lost ? 'lost' : 'broken');
    const [buoyReplaceReason, setBuoyReplaceReason] = useState(logToEdit?.metadata?.buoy_replace_reason || '');

    // History
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        loadHistory();
        loadTideData();
    }, [buoy.id]);

    const loadTideData = async () => {
        setIsLoadingTide(true);
        try {
            const response = await fetch(`/api/tide?lat=${buoy.location.lat}&lng=${buoy.location.lng}`);
            if (response.ok) {
                const data = await response.json();
                setTideData(data.nearest ? { ...data.nearest, ...data.advice } : null);
            }
        } catch (error) {
            console.error('Failed to load tide data', error);
        } finally {
            setIsLoadingTide(false);
        }
    };

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch(`/api/buoys/${buoy.id}/maintenance`);
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        // Load available stock when replacement is toggled
        if (replaceChain && availableChains.length === 0) loadStock('Ketting', selectedChainId);
        if (replaceLight && availableLights.length === 0) loadStock('Lamp', selectedLightId);
        if (replaceSinker && availableSinkers.length === 0) loadStock('Steen', selectedSinkerId);
        if (replaceShackle && availableShackles.length === 0) loadStock('Sluiting', shackleReplacements[0]?.assetId);
        if (replaceZinc && availableZincs.length === 0) loadStock('Zinkblok', selectedZincId);
        if (replaceBuoy && availableBuoys.length === 0) loadStock('Boei', selectedBuoyId);
    }, [replaceChain, replaceLight, replaceSinker, replaceShackle, replaceZinc, replaceBuoy]);

    const loadStock = async (category: string, includeAssetId?: string) => {
        try {
            const url = new URL('/api/inventory/available', window.location.origin);
            url.searchParams.set('category', category);
            if (includeAssetId) {
                url.searchParams.set('includeAssetId', includeAssetId);
            }

            const response = await fetch(url.toString());
            if (response.ok) {
                const data = await response.json();
                if (category === 'Ketting') setAvailableChains(data);
                if (category === 'Lamp') setAvailableLights(data);
                if (category === 'Steen') setAvailableSinkers(data);
                if (category === 'Sluiting') setAvailableShackles(data);
                if (category === 'Zinkblok') setAvailableZincs(data);
                if (category === 'Boei') setAvailableBuoys(data);
            }
        } catch (error) {
            console.error(`Failed to load ${category} stock`, error);
        }
    };

    const openCreateDialog = async (category: string) => {
        try {
            const response = await fetch(`/api/inventory/types?category=${category}`);
            if (response.ok) {
                const types = await response.json();
                setCreationItemTypes(types);
                setCreationCategory(category);
            } else {
                alert(`Kon item types niet laden voor ${category}`);
            }
        } catch (error) {
            console.error(error);
            alert(`Kon item types niet ophalen.`);
        }
    };

    const getTideAdvice = (): { possible: boolean; title: string, description: string } => {
        if (!tideData) return { possible: true, title: 'Getij onbekend', description: 'Kon geen live data ophalen.' };

        const isLowTide = tideData.isLowWindow;
        const isHighTide = tideData.isHighWindow;
        const unit = tideData.unit || 'cm';
        const datum = tideData.datum || 'NAP';

        if (tideRestriction === 'Laag water') {
            if (isLowTide) return { possible: true, title: 'Onderhoud Mogelijk', description: `Het is momenteel laag water window (${tideData.currentLevel}${unit} ${datum}).` };
            const threshold = unit === 'm' ? '1.0' : '100';
            return { possible: false, title: 'Onderhoud Niet Mogelijk', description: `Wacht op laag water (onder ${threshold}${unit} ${datum}).` };
        }

        if (tideRestriction === 'Hoog water') {
            if (isHighTide) return { possible: true, title: 'Onderhoud Mogelijk', description: `Het is momenteel hoog water window (${tideData.currentLevel}${unit} ${datum}).` };
            const threshold = unit === 'm' ? '4.0' : '400';
            return { possible: false, title: 'Onderhoud Niet Mogelijk', description: `Wacht tot het water hoog genoeg staat (boven ${threshold}${unit} ${datum}).` };
        }

        return { possible: true, title: 'Onderhoud Mogelijk', description: 'Geen getij-beperking voor deze boei.' };
    };

    const [needsAttention, setNeedsAttention] = useState(() => {
        if (logToEdit?.metadata?.status) {
            return logToEdit.metadata.status === 'Maintenance';
        }
        // Default to current buoy status if no explicit log status exists
        return buoy.status === 'Maintenance';
    });

    const handleSave = async () => {
        if (!buoy.id) {
            alert('Ongeldige boei ID');
            return;
        }

        setIsSaving(true);
        try {
            const body = {
                id: logToEdit?.id, // Pass ID if editing
                buoy_id: buoy.id,
                technician,
                service_date: date,
                notes,
                tide_restriction: tideRestriction,
                light_character: lightCharacter,
                status: needsAttention ? 'Maintenance' : 'OK',
                replacements: {
                    buoy: replaceBuoy ? selectedBuoyId : null,
                    chain: replaceChain ? selectedChainId : null,
                    light: replaceLight ? selectedLightId : null,
                    sinker: replaceSinker ? selectedSinkerId : null,
                    shackles: replaceShackle ? shackleReplacements : null,
                    zinc: replaceZinc ? selectedZincId : null,
                    buoy_lost: buoyOldStatus === 'lost',
                    buoy_replace_reason: replaceBuoy ? buoyReplaceReason : null,
                    chain_lost: chainOldStatus === 'lost',
                    light_lost: lightOldStatus === 'lost',
                    sinker_lost: sinkerOldStatus === 'lost',
                    zinc_lost: zincOldStatus === 'lost',
                    buoy_cleaned: buoyCleaned,
                    light_tested: lightTested
                }
            };

            const response = await fetch('/api/maintenance/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.mode === 'planned') {
                    alert('Onderhoud gepland voor ' + new Date(date).toLocaleDateString('nl-BE'));
                } else {
                    onUpdate(data.buoy);
                }
                onClose();
            } else {
                alert('Fout bij opslaan onderhoud');
            }
        } catch (error) {
            console.error(error);
            alert('Er is een fout opgetreden');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">

            {showRawTideData && tideData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-app-surface border border-app-border rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
                        <button
                            onClick={() => setShowRawTideData(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-app-bg transition-colors"
                        >
                            <X className="w-5 h-5 text-app-text-secondary" />
                        </button>
                        <h3 className="text-lg font-bold text-app-text-primary mb-4">Live Getij Grafiek</h3>
                        <div className="bg-app-bg rounded-lg overflow-hidden h-[60vh] border border-app-border">
                            {tideData.embedUrl ? (
                                <iframe
                                    src={tideData.embedUrl}
                                    className="w-full h-full border-0 bg-white"
                                    title="Tide Data Chart"
                                />
                            ) : (
                                <div className="p-6 flex flex-col items-center justify-center h-full text-center gap-4">
                                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                                    <div>
                                        <h4 className="font-bold text-app-text-primary">Insluiten niet beschikbaar</h4>
                                        <p className="text-sm text-app-text-secondary mt-1">
                                            Voor dit station ({tideData.source}) is momenteel geen interactieve grafiek beschikbaar.
                                            Je kan de ruwe API link hieronder bezoeken.
                                        </p>
                                    </div>
                                    <a
                                        href={tideData.fetchUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Open Externe Bron
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-app-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-app-border flex justify-between items-center sticky top-0 bg-app-surface z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                            <Hammer className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-app-text-primary">Onderhoud Registreren</h2>
                            <p className="text-sm text-app-text-secondary">{buoy.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-app-surface-hover rounded-full transition-colors">
                        <X className="w-5 h-5 text-app-text-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">

                    {/* General Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-app-text-secondary">Technieker</label>
                            <input
                                type="text"
                                value={technician}
                                onChange={(e) => setTechnician(e.target.value)}
                                placeholder="Naam uitvoerder"
                                className="w-full px-4 py-2 rounded-lg border border-app-border bg-app-bg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-app-text-secondary">Datum</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-app-border bg-app-bg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Tide Restriction & Live Advice (Read-Only) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-app-text-secondary flex items-center gap-2">
                                <Anchor className="w-4 h-4" />
                                Getij Beperking & Advies
                            </label>
                            {isLoadingTide && (
                                <div className="text-[10px] text-blue-500 animate-pulse font-bold uppercase tracking-widest">
                                    Getij ophalen...
                                </div>
                            )}
                        </div>

                        {/* Live Tide Status Card */}
                        <button
                            type="button"
                            onClick={() => { if (tideData) setShowRawTideData(true); }}
                            className={clsx(
                                "w-full text-left p-4 rounded-xl border flex flex-col gap-3 transition-all",
                                !tideData ? "bg-app-bg border-app-border cursor-default" :
                                    (getTideAdvice().possible
                                        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 hover:bg-green-100 cursor-pointer"
                                        : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 hover:bg-red-100 cursor-pointer")
                            )}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={clsx(
                                        "p-2 rounded-lg",
                                        !tideData ? "bg-gray-200" : (getTideAdvice().possible ? "bg-green-500" : "bg-red-500")
                                    )}>
                                        {getTideAdvice().possible ? <CheckCircle className="w-5 h-5 text-white" /> : <AlertTriangle className="w-5 h-5 text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-app-text-primary flex items-center gap-2">
                                            {getTideAdvice().possible ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                                            {getTideAdvice().title}
                                        </p>
                                        <p className="text-xs text-app-text-secondary">
                                            {getTideAdvice().description}
                                        </p>
                                    </div>
                                </div>
                                {tideData && (
                                    <div className="text-right">
                                        <div className="text-[10px] text-app-text-secondary font-bold uppercase tracking-tighter mb-1">
                                            Station: {tideData.name}
                                        </div>
                                        <div className="text-lg font-black text-app-text-primary leading-none">
                                            {tideData.currentLevel}{tideData.unit}
                                            <span className="text-[10px] ml-1 opacity-50 font-normal">{tideData.datum}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-app-text-secondary flex items-center justify-end gap-1 mt-1">
                                            {tideData.trend === 'rising' ? '▲ STIJGEND' : '▼ DALEND'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </button>

                        <div className="text-xs text-app-text-secondary italic flex items-center justify-between gap-2">
                            <span>
                                * De getij beperking voor deze boei is ingesteld op: <span className="font-bold">{tideRestriction}</span>.
                            </span>
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="text-blue-600 hover:text-blue-800 underline font-bold text-xs"
                                >
                                    Wijzig instellingen
                                </button>
                            )}
                        </div>
                    </div>

                    {/* History Section - only show latest */}
                    {!isEditingHistory && (
                        <div className="border-t border-app-border pt-6">
                            <h3 className="text-sm font-bold text-app-text-primary mb-3 uppercase tracking-wider">Laatste Onderhoud</h3>
                            {isLoadingHistory ? (
                                <div className="h-16 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : history.length > 0 ? (() => {
                                const last = history[0];
                                const meta = last.metadata || {};
                                const replacements = [];
                                if (meta.chain) replacements.push({ label: meta.replacement_names?.chain || 'Ketting', lost: meta.chain_lost });
                                if (meta.light) replacements.push({ label: meta.replacement_names?.light || 'Lamp', lost: meta.light_lost });
                                if (meta.sinker) replacements.push({ label: meta.replacement_names?.sinker || 'Steen', lost: meta.sinker_lost });
                                if (meta.buoy) replacements.push({ label: meta.replacement_names?.buoy || 'Boei Body', lost: meta.buoy_lost });
                                if (meta.shackles && Array.isArray(meta.shackles) && meta.shackles.length > 0) replacements.push({ label: meta.replacement_names?.shackles || `${meta.shackles.length}× Sluiting`, lost: false });
                                if (meta.zinc) replacements.push({ label: meta.replacement_names?.zinc || 'Zinkblok', lost: meta.zinc_lost });
                                return (
                                    <div className="p-4 rounded-xl bg-app-bg/50 border border-app-border space-y-3">
                                        {/* Header */}
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-app-text-primary text-sm">
                                                {new Date(last.service_date).toLocaleDateString('nl-BE')}
                                            </span>
                                            <span className="text-xs font-semibold text-app-text-secondary uppercase tracking-wide">{last.technician || 'Onbekend'}</span>
                                        </div>
                                        {/* Notes */}
                                        <p className="text-xs text-app-text-secondary italic border-l-2 border-app-border pl-2">
                                            {(last.notes || last.description) ? `"${last.notes || last.description}"` : '—'}
                                        </p>
                                        {/* Replacements */}
                                        {replacements.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {replacements.map((r, i) => (
                                                    <div key={i} className={clsx(
                                                        'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border',
                                                        r.lost
                                                            ? 'bg-red-100 text-red-900 border-red-300'
                                                            : 'bg-orange-100 text-orange-900 border-orange-300'
                                                    )}>
                                                        <span>{r.label}</span>
                                                        <span className={clsx(
                                                            'text-[10px] font-bold px-2 py-0.5 rounded-full text-white',
                                                            r.lost ? 'bg-red-600' : 'bg-orange-600'
                                                        )}>
                                                            {r.lost ? 'Kwijt' : 'Stuk'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* Next service due */}
                                        {buoy.nextServiceDue && (
                                            <div className="flex items-center gap-1.5 text-xs text-app-text-secondary pt-1 border-t border-app-border">
                                                <span className="font-semibold text-app-text-primary">Volgend onderhoud:</span>
                                                <span className={clsx(
                                                    'font-bold',
                                                    new Date(buoy.nextServiceDue) < new Date() ? 'text-red-600' : 'text-green-600'
                                                )}>
                                                    {new Date(buoy.nextServiceDue).toLocaleDateString('nl-BE')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })() : (
                                <p className="text-xs text-app-text-secondary italic">Geen historiek gevonden.</p>
                            )}
                        </div>
                    )}

                    <div className="border-t border-app-border pt-6">
                        <h3 className="text-lg font-semibold text-app-text-primary mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Componenten Vervangen
                        </h3>

                        <div className="space-y-4">
                            {/* Buoy Replacement */}
                            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 p-2 rounded-lg shadow-sm">
                                            <Ship className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-app-text-primary text-blue-900 dark:text-blue-100">Boei Vervangen</span>
                                            <p className="text-xs text-app-text-secondary">Huidig: {buoy.buoyType.name} ({buoy.buoyType.color})</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={replaceBuoy} onChange={(e) => setReplaceBuoy(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {replaceBuoy && (
                                    <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 bg-white/50 dark:bg-black/20 p-4 border border-blue-100 dark:border-blue-800 rounded-lg">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-bold text-app-text-secondary uppercase">Status oude boei</label>
                                            <div className="flex p-0.5 bg-app-bg rounded-lg border border-app-border w-fit">
                                                <button onClick={() => setBuoyOldStatus('broken')} className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", buoyOldStatus === 'broken' ? "bg-orange-500 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary")}>
                                                    Stuk (Onderhoud)
                                                </button>
                                                <button onClick={() => setBuoyOldStatus('lost')} className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", buoyOldStatus === 'lost' ? "bg-red-600 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary")}>
                                                    Kwijt (Verloren/Aangevaren)
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-app-text-secondary uppercase block">Reden voor vervanging</label>
                                            <textarea
                                                value={buoyReplaceReason}
                                                onChange={(e) => setBuoyReplaceReason(e.target.value)}
                                                placeholder="Bijv. aangevaren, zware schade door stroming..."
                                                className="w-full px-3 py-2 text-sm rounded-lg border border-app-border bg-app-bg focus:ring-2 focus:ring-blue-500 outline-none transition-all h-20 resize-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-app-text-secondary uppercase mb-1 block">Nieuwe Boei uit Stock</label>
                                            <AssetPicker items={availableBuoys} value={selectedBuoyId} onChange={setSelectedBuoyId} onAddNew={() => openCreateDialog('Boei')} placeholder="Selecteer nieuwe boei..." />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chain Replacement */}
                            <div className="p-4 rounded-xl border border-app-border bg-app-bg/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-app-surface p-2 rounded-lg shadow-sm">
                                            <Link className="w-5 h-5 text-app-text-secondary" />
                                        </div>
                                        <div>
                                            <span className="font-medium text-app-text-primary">Ketting Vervangen</span>
                                            <p className="text-xs text-app-text-secondary">Huidig: {buoy.chain.type} {buoy.chain.length}</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={replaceChain} onChange={(e) => setReplaceChain(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {replaceChain && (
                                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-bold text-app-text-secondary uppercase">Status oud onderdeel</label>
                                            <div className="flex p-0.5 bg-app-bg rounded-lg border border-app-border w-fit">
                                                <button
                                                    onClick={() => setChainOldStatus('broken')}
                                                    className={clsx(
                                                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                        chainOldStatus === 'broken' ? "bg-orange-500 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary"
                                                    )}
                                                >
                                                    Stuk (Onderhoud)
                                                </button>
                                                <button
                                                    onClick={() => setChainOldStatus('lost')}
                                                    className={clsx(
                                                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                        chainOldStatus === 'lost' ? "bg-red-600 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary"
                                                    )}
                                                >
                                                    Kwijt (Verloren)
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-app-text-secondary uppercase mb-1 block">Nieuwe Ketting uit Stock</label>
                                            <AssetPicker
                                                items={availableChains}
                                                value={selectedChainId}
                                                onChange={setSelectedChainId}
                                                onAddNew={() => openCreateDialog('Ketting')}
                                                placeholder="Selecteer ketting..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Light Replacement */}
                            <div className="p-4 rounded-xl border border-app-border bg-app-bg/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-app-surface p-2 rounded-lg shadow-sm">
                                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                                        </div>
                                        <div>
                                            <span className="font-medium text-app-text-primary">Lamp Vervangen</span>
                                            <p className="text-xs text-app-text-secondary">Huidig: {buoy.light.type} ({buoy.light.serialNumber || buoy.light.serial_number || buoy.light.article_number || 'Geen ID'})</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={replaceLight} onChange={(e) => setReplaceLight(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {replaceLight && (
                                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-bold text-app-text-secondary uppercase">Status oud onderdeel</label>
                                            <div className="flex p-0.5 bg-app-bg rounded-lg border border-app-border w-fit">
                                                <button
                                                    onClick={() => setLightOldStatus('broken')}
                                                    className={clsx(
                                                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                        lightOldStatus === 'broken' ? "bg-orange-500 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary"
                                                    )}
                                                >
                                                    Stuk (Onderhoud)
                                                </button>
                                                <button
                                                    onClick={() => setLightOldStatus('lost')}
                                                    className={clsx(
                                                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                        lightOldStatus === 'lost' ? "bg-red-600 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary"
                                                    )}
                                                >
                                                    Kwijt (Verloren)
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-app-text-secondary uppercase mb-1 block">Nieuwe Lamp uit Stock</label>
                                            <AssetPicker
                                                items={availableLights}
                                                value={selectedLightId}
                                                onChange={setSelectedLightId}
                                                onAddNew={() => openCreateDialog('Lamp')}
                                                placeholder="Selecteer lamp..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sinker Replacement */}
                            <div className="p-4 rounded-xl border border-app-border bg-app-bg/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-app-surface p-2 rounded-lg shadow-sm">
                                            <Anchor className="w-5 h-5 text-app-text-secondary" />
                                        </div>
                                        <div>
                                            <span className="font-medium text-app-text-primary">Steen Vervangen</span>
                                            <p className="text-xs text-app-text-secondary">Huidig: {buoy.sinker.type} ({buoy.sinker.weight})</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={replaceSinker} onChange={(e) => setReplaceSinker(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {replaceSinker && (
                                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-bold text-app-text-secondary uppercase">Status oud onderdeel</label>
                                            <div className="flex p-0.5 bg-app-bg rounded-lg border border-app-border w-fit">
                                                <button
                                                    onClick={() => setSinkerOldStatus('broken')}
                                                    className={clsx(
                                                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                        sinkerOldStatus === 'broken' ? "bg-orange-500 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary"
                                                    )}
                                                >
                                                    Stuk (Onderhoud)
                                                </button>
                                                <button
                                                    onClick={() => setSinkerOldStatus('lost')}
                                                    className={clsx(
                                                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                        sinkerOldStatus === 'lost' ? "bg-red-600 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary"
                                                    )}
                                                >
                                                    Kwijt (Verloren)
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-app-text-secondary uppercase mb-1 block">Nieuwe Steen uit Stock</label>
                                            <AssetPicker
                                                items={availableSinkers}
                                                value={selectedSinkerId}
                                                onChange={setSelectedSinkerId}
                                                onAddNew={() => openCreateDialog('Steen')}
                                                placeholder="Selecteer steen..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Shackle Replacement */}
                            <div className="p-4 rounded-xl border border-app-border bg-app-bg/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-app-surface p-2 rounded-lg shadow-sm">
                                            <ShieldCheck className="w-5 h-5 text-purple-500" />
                                        </div>
                                        <div>
                                            <span className="font-medium text-app-text-primary">Sluiting Vervangen</span>
                                            <p className="text-xs text-app-text-secondary">Schakels / D-sluitingen / G-haken / Breidels</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={replaceShackle} onChange={(e) => setReplaceShackle(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                {replaceShackle && (
                                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {shackleReplacements.map((shackle, index) => (
                                            <div key={shackle.id} className="relative p-4 rounded-xl border border-app-border bg-app-surface/50 shadow-sm group">
                                                {shackleReplacements.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShackleReplacements(prev => prev.filter(s => s.id !== shackle.id))}
                                                        className="absolute top-2 right-2 p-1.5 text-app-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] font-bold text-app-text-secondary uppercase">Status oud onderdeel</label>
                                                        <div className="flex p-0.5 bg-app-bg rounded-lg border border-app-border w-fit">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newReps = [...shackleReplacements];
                                                                    newReps[index].oldStatus = 'broken';
                                                                    setShackleReplacements(newReps);
                                                                }}
                                                                className={clsx(
                                                                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                                    shackle.oldStatus === 'broken' ? "bg-orange-500 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary"
                                                                )}
                                                            >
                                                                Stuk (Onderhoud)
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newReps = [...shackleReplacements];
                                                                    newReps[index].oldStatus = 'lost';
                                                                    setShackleReplacements(newReps);
                                                                }}
                                                                className={clsx(
                                                                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                                    shackle.oldStatus === 'lost' ? "bg-red-600 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary"
                                                                )}
                                                            >
                                                                Kwijt (Verloren)
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-app-text-secondary uppercase mb-1 block">Nieuwe Sluiting uit Stock</label>
                                                        <AssetPicker
                                                            items={availableShackles}
                                                            value={shackle.assetId}
                                                            onChange={(newId) => {
                                                                const newReps = [...shackleReplacements];
                                                                newReps[index].assetId = newId;
                                                                setShackleReplacements(newReps);
                                                            }}
                                                            onAddNew={() => openCreateDialog('Sluiting')}
                                                            placeholder="Selecteer sluiting..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <button
                                            type="button"
                                            onClick={() => setShackleReplacements(prev => [...prev, { id: Math.random().toString(36).substring(7), assetId: '', oldStatus: 'broken' }])}
                                            className="w-full py-2 border-2 border-dashed border-app-border/70 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-app-text-secondary hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="text-lg leading-none">+</span> Voeg nog een sluiting toe
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Zinc Block Replacement */}
                            <div className="p-4 rounded-xl border border-app-border bg-app-bg/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-app-surface p-2 rounded-lg shadow-sm">
                                            <Layers className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <span className="font-medium text-app-text-primary">Zinkblok Vervangen</span>
                                            <p className="text-xs text-app-text-secondary">Zinkblok</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={replaceZinc} onChange={(e) => setReplaceZinc(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                {replaceZinc && (
                                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-bold text-app-text-secondary uppercase">Status oud onderdeel</label>
                                            <div className="flex p-0.5 bg-app-bg rounded-lg border border-app-border w-fit">
                                                <button onClick={() => setZincOldStatus('broken')} className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", zincOldStatus === 'broken' ? "bg-orange-500 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary")}>
                                                    Stuk (Onderhoud)
                                                </button>
                                                <button onClick={() => setZincOldStatus('lost')} className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", zincOldStatus === 'lost' ? "bg-red-600 text-white shadow-sm" : "text-app-text-secondary hover:text-app-text-primary")}>
                                                    Kwijt (Verloren)
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-app-text-secondary uppercase mb-1 block">Nieuw Zinkblok uit Stock</label>
                                            <AssetPicker items={availableZincs} value={selectedZincId} onChange={setSelectedZincId} onAddNew={() => openCreateDialog('Zinkblok')} placeholder="Selecteer zinkblok..." />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Light Character */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-app-text-secondary">Licht Karakter</label>
                        <LightCharacterInput
                            value={lightCharacter}
                            onChange={(val) => setLightCharacter(val)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={buoyCleaned}
                                    onChange={(e) => setBuoyCleaned(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <div>
                                    <span className="block text-sm font-bold text-blue-800 dark:text-blue-400">Boei afgespoten</span>
                                    <span className="block text-[10px] text-blue-600/80 dark:text-blue-500/80 uppercase font-bold">Reinigen</span>
                                </div>
                            </label>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={lightTested}
                                    onChange={(e) => setLightTested(e.target.checked)}
                                    className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                                />
                                <div>
                                    <span className="block text-sm font-bold text-amber-800 dark:text-amber-400">Lamp getest</span>
                                    <span className="block text-[10px] text-amber-600/80 dark:text-amber-500/80 uppercase font-bold">Functionaliteit</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Status / Attention */}
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={needsAttention}
                                onChange={(e) => setNeedsAttention(e.target.checked)}
                                className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                            />
                            <div>
                                <span className="block text-sm font-bold text-orange-800 dark:text-orange-400">Onderhoud nog niet klaar / Aandacht nodig</span>
                                <span className="block text-xs text-orange-600/80 dark:text-orange-500/80">Vink dit aan als de werkzaamheden nog niet zijn afgerond of er problemen zijn.</span>
                            </div>
                        </label>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-app-text-secondary">Notities / Verslag</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Beschrijf de uitgevoerde werken..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-app-border bg-app-bg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-app-border bg-app-bg/50 flex justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-app-text-secondary font-medium hover:bg-app-surface-hover transition-colors"
                        disabled={isSaving}
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Opslaan...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Onderhoud Opslaan
                            </>
                        )}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={() => {
                    setShowConfirmDialog(false);
                    handleSave();
                }}
                title={isEditingHistory ? "Onderhoud Aanpassen" : "Onderhoud Opslaan"}
                message={isEditingHistory
                    ? "Weet je zeker dat je dit bestaande rapport wilt overschrijven?"
                    : "Weet je zeker dat je dit onderhoud wilt opslaan? Controleer of alle verbruikte materialen correct zijn ingegeven."}
                confirmLabel="Ja, opslaan"
                cancelLabel="Terug"
                variant="info"
            />

            <AssetDialog
                isOpen={!!creationCategory}
                onClose={() => {
                    if (creationCategory) {
                        loadStock(creationCategory);
                    }
                    setCreationCategory(null);
                }}
                mode="create"
                category={creationCategory || ''}
                itemTypes={creationItemTypes}
            />
        </div>
    );
}
