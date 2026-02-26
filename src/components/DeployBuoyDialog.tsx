"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Save, Anchor, Link, CircleDot, Lightbulb, Hexagon, Wand2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { parseSmartInput } from "@/lib/coordinates";

import { BuoyIcon } from "./BuoyIcon";
import { SearchableSelect } from "./SearchableSelect";
import { StoneIcon } from "./StoneIcon";
import { ChainIcon } from "./ChainIcon";
import { deployBuoyAction } from "@/app/actions";

interface DeployBuoyDialogProps {
    isOpen: boolean;
    onClose: () => void;
    availableBuoys: any[];
    availableChains: any[];
    availableStones: any[];
    availableTopmarks: any[];
    availableLights: any[];
}

export function DeployBuoyDialog({
    isOpen,
    onClose,
    availableBuoys,
    availableChains,
    availableStones,
    availableTopmarks,
    availableLights
}: DeployBuoyDialogProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        name: "",
        lat: "",
        lng: "",
        notes: "",
        buoyId: "",
        chainId: "",
        stoneId: "",
        topmarkId: "",
        lightId: ""
    });

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            if (!formData.name || !formData.buoyId || !formData.lat || !formData.lng) {
                throw new Error("Vul alle verplichte velden in.");
            }

            const fd = new FormData();
            fd.append('name', formData.name);
            fd.append('lat', formData.lat);
            fd.append('lng', formData.lng);
            fd.append('buoy_id', formData.buoyId);
            if (formData.chainId) fd.append('chain_id', formData.chainId);
            if (formData.stoneId) fd.append('stone_id', formData.stoneId);
            if (formData.topmarkId) fd.append('topmark_id', formData.topmarkId);
            if (formData.lightId) fd.append('lamp_id', formData.lightId);
            if (formData.notes) fd.append('notes', formData.notes);

            const result = await deployBuoyAction(null, fd);

            if (result.success) {
                onClose();
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper to find selected item details
    const selectedBuoy = availableBuoys.find(b => b.id === formData.buoyId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-app-surface border border-app-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-app-text-primary">Nieuwe Boei Uitleggen</h2>
                        <p className="text-xs text-app-text-secondary">Stap {step} van 3</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-app-surface-hover rounded-lg transition-colors">
                        <X className="w-5 h-5 text-app-text-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6">
                            <h3 className="font-medium text-app-text-primary border-b border-app-border pb-2">1. Kies een Boei</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-app-text-secondary mb-1">Naam van de positie *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:border-blue-500 focus:outline-none"
                                        placeholder="bijv. Z-Boei Oosterweel"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-app-text-secondary mb-2">Selecteer Drijflichaam *</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                                        {availableBuoys.map(buoy => (
                                            <div
                                                key={buoy.id}
                                                onClick={() => setFormData({ ...formData, buoyId: buoy.id })}
                                                className={clsx(
                                                    "p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3",
                                                    formData.buoyId === buoy.id
                                                        ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500"
                                                        : "bg-app-bg border-app-border hover:border-app-text-secondary/50"
                                                )}
                                            >
                                                <BuoyIcon color={buoy.metadata.color} size="sm" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-app-text-primary truncate">{buoy.name}</div>
                                                    <div className="text-xs text-app-text-secondary truncate">{buoy.details}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8">
                            <h3 className="font-medium text-app-text-primary border-b border-app-border pb-2">2. Componenten Toevoegen</h3>

                            {/* Ketting */}
                            <div>
                                <label className="block text-xs font-medium text-app-text-secondary mb-2 flex items-center gap-2">
                                    <Link className="w-3 h-3" /> Ketting
                                </label>
                                <SearchableSelect
                                    value={formData.chainId}
                                    onChange={val => setFormData({ ...formData, chainId: val })}
                                    options={[{ value: '', label: 'Geen ketting' }, ...availableChains.map(c => ({ value: c.id, label: `${c.name} - ${c.details} (${c.location})` }))]}
                                    placeholder="Selecteer ketting..."
                                />
                            </div>

                            {/* Steen */}
                            <div>
                                <label className="block text-xs font-medium text-app-text-secondary mb-2 flex items-center gap-2">
                                    <Anchor className="w-3 h-3" /> Steen
                                </label>
                                <SearchableSelect
                                    value={formData.stoneId}
                                    onChange={val => setFormData({ ...formData, stoneId: val })}
                                    options={[{ value: '', label: 'Geen steen' }, ...availableStones.map(s => ({ value: s.id, label: `${s.metadata?.weight}t ${s.metadata?.shape} (${s.location})` }))]}
                                    placeholder="Selecteer steen..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Topteken */}
                                <div>
                                    <label className="block text-xs font-medium text-app-text-secondary mb-2 flex items-center gap-2">
                                        <Hexagon className="w-3 h-3" /> Topteken
                                    </label>
                                    <SearchableSelect
                                        value={formData.topmarkId}
                                        onChange={val => setFormData({ ...formData, topmarkId: val })}
                                        options={[{ value: '', label: 'Geen' }, ...availableTopmarks.map(t => ({ value: t.id, label: t.name }))]}
                                        placeholder="Selecteer topteken..."
                                    />
                                </div>

                                {/* Lamp */}
                                <div>
                                    <label className="block text-xs font-medium text-app-text-secondary mb-2 flex items-center gap-2">
                                        <Lightbulb className="w-3 h-3" /> Lamp
                                    </label>
                                    <SearchableSelect
                                        value={formData.lightId}
                                        onChange={val => setFormData({ ...formData, lightId: val })}
                                        options={[{ value: '', label: 'Geen' }, ...availableLights.map(l => ({ value: l.id, label: l.name }))]}
                                        placeholder="Selecteer lamp..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <h3 className="font-medium text-app-text-primary border-b border-app-border pb-2">3. Locatie & Bevestigen</h3>

                            {/* Slim Plakken (Moved here to only show in Location step) */}
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 border-dashed">
                                <label className="block text-xs font-semibold text-app-text-primary mb-2 flex items-center gap-2">
                                    <Wand2 className="w-3 h-3 text-purple-500" /> Slim Plakken (Automatisch)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Plak coördinaten (bijv. 143171.72E; 226052.47N)"
                                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:border-purple-500 focus:outline-none mb-1 font-mono placeholder:font-sans"
                                    onChange={(e) => {
                                        const res = parseSmartInput(e.target.value);
                                        if (res && !res.error && res.lat !== null && res.lng !== null) {
                                            setFormData(prev => ({
                                                ...prev,
                                                lat: res.lat!.toFixed(6),
                                                lng: res.lng!.toFixed(6)
                                            }));
                                            toast.success(`Locatie herkend (${res.formatDetected})`);
                                            e.target.value = ''; // Clear after successful parse
                                        }
                                    }}
                                />
                                <p className="text-[10px] text-app-text-secondary">Plak hier coördinaten om de velden hieronder automatisch in te vullen.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-app-text-secondary mb-1">Breedtegraad (Lat)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.lat}
                                        onChange={e => setFormData({ ...formData, lat: e.target.value })}
                                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:border-blue-500 focus:outline-none"
                                        placeholder="51.23..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-text-secondary mb-1">Lengtegraad (Lng)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.lng}
                                        onChange={e => setFormData({ ...formData, lng: e.target.value })}
                                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:border-blue-500 focus:outline-none"
                                        placeholder="4.41..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-app-text-secondary mb-1">Notities</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:border-blue-500 focus:outline-none min-h-[80px]"
                                    placeholder="Extra info over deze uitlegging..."
                                />
                            </div>

                            <div className="p-4 bg-app-bg rounded-lg border border-app-border text-sm space-y-2">
                                <div className="font-medium text-app-text-primary">Samenvatting:</div>
                                <div className="grid grid-cols-2 gap-2 text-app-text-secondary">
                                    <span>Naam:</span> <span className="text-app-text-primary">{formData.name}</span>
                                    <span>Boei:</span> <span className="text-app-text-primary">{selectedBuoy?.name}</span>
                                    <span>Ketting:</span> <span className="text-app-text-primary">{availableChains.find(c => c.id === formData.chainId)?.name || '-'}</span>
                                    <span>Steen:</span> <span className="text-app-text-primary">{availableStones.find(s => s.id === formData.stoneId)?.metadata?.weight ? `${availableStones.find(s => s.id === formData.stoneId)?.metadata?.weight}t` : '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-app-border bg-app-surface/50 flex justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-app-text-secondary hover:text-red-500 transition-colors"
                        >
                            Annuleren
                        </button>
                        <button
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            disabled={step === 1 || loading}
                            className="px-4 py-2 text-sm font-medium text-app-text-secondary hover:text-app-text-primary disabled:opacity-50"
                        >
                            Vorige
                        </button>
                    </div>

                    {step < 3 ? (
                        <button
                            onClick={() => setStep(s => Math.min(3, s + 1))}
                            disabled={!formData.name || !formData.buoyId} // Basic validation
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Volgende
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.lat || !formData.lng}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? "Bezig..." : "Bevestigen & Uitleggen"}
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
}
