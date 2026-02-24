"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
    X, MapPin, Save, Anchor, Link as LinkIcon,
    CircleDot, Lightbulb, Hexagon, ChevronRight,
    ChevronLeft, Check, Ship, Loader2, Sparkles,
    Navigation, Map as MapIcon, ChevronDown, Search,
    Camera, Upload
} from "lucide-react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { deployBuoyAction } from "@/app/actions";
import { BuoyIcon } from "@/components/BuoyIcon";
import { BuoyMap } from "@/components/BuoyMap";
import { ChainIcon } from "@/components/ChainIcon";
import { StoneIcon } from "@/components/StoneIcon";
import { LightCharacterInput } from '@/components/LightCharacterInput';
import { DeployedBuoy } from "@/lib/data";

interface UitleggenClientProps {
    availableBuoys: any[];
    availableChains: any[];
    availableStones: any[];
    availableTopmarks: any[];
    availableLights: any[];
    existingBuoys: DeployedBuoy[];
}

// Shared helper for technical asset labels
const getAssetTechnicalLabel = (item: any, type: 'chain' | 'stone' | 'light' | 'topmark' | 'buoy', placeholder: string = "") => {
    if (!item) return placeholder;
    if (type === 'chain') {
        const specs = [];
        if (item.specs?.length) specs.push(`${item.specs.length}m`);
        if (item.specs?.thickness) specs.push(`${item.specs.thickness}mm`);
        const specStr = specs.length > 0 ? specs.join(' ') : item.details;
        return specStr ? `${item.name} (${specStr})` : item.name;
    }
    if (type === 'stone') {
        const specs = [];
        if (item.specs?.weight) specs.push(`${item.specs.weight}t`);
        if (item.specs?.shape) specs.push(item.specs.shape);
        const specStr = specs.length > 0 ? specs.join(' ') : item.details;
        return specStr ? `${item.name} (${specStr})` : item.name;
    }
    if (type === 'light') {
        const sn = item.metadata?.serial_number || item.metadata?.serialNumber || item.metadata?.article_number || item.metadata?.s_n || item.id.slice(0, 8);
        return `${sn} - ${item.name}`;
    }
    return item.name;
};

const getLightColorClass = (item: any) => {
    if (!item) return "text-amber-500";
    const color = (item.metadata?.color || item.metadata?.lamp_color || item.color || "").toLowerCase();
    if (color.includes('rood')) return "text-red-500";
    if (color.includes('groen')) return "text-green-500";
    if (color.includes('geel')) return "text-yellow-400";
    if (color.includes('wit')) return "text-slate-100";
    return "text-amber-500";
};

// Visual Dropdown Component for Asset Selection
const VisualDropdown = ({
    label,
    icon: LabelIcon,
    items,
    value,
    onChange,
    type,
    placeholder
}: {
    label: string,
    icon: any,
    items: any[],
    value: string,
    onChange: (v: string) => void,
    type: 'chain' | 'stone' | 'light' | 'topmark',
    placeholder: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const selectedItem = items.find(i => i.id === value);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && searchRef.current) {
            searchRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredItems = useMemo(() => {
        if (!searchQuery) return items;
        const q = searchQuery.toLowerCase();
        return items.filter(item => {
            const name = (item.name || "").toLowerCase();
            const sn = (item.metadata?.serial_number || item.metadata?.serialNumber || item.metadata?.article_number || item.id || "").toLowerCase();
            const details = (item.details || "").toLowerCase();
            const specs = JSON.stringify(item.specs || "").toLowerCase();
            return name.includes(q) || sn.includes(q) || details.includes(q) || specs.includes(q);
        });
    }, [items, searchQuery]);

    const renderItemIcon = (item: any, size: "sm" | "md" = "sm") => {
        if (!item && size === "md") return null;
        if (type === 'chain') return <ChainIcon color={item?.name || 'Zwart'} size={size} />;
        if (type === 'stone') return <StoneIcon shape={item?.specs?.shape || 'Rond'} size={size} />;
        if (type === 'light') return <Lightbulb className={clsx(size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4", getLightColorClass(item))} />;
        if (type === 'topmark') return <Hexagon className={clsx(size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4", "text-emerald-500")} />;
        return null;
    };

    const getItemLabel = (item: any) => {
        if (!item) return placeholder;
        if (type === 'chain') {
            const specs = [];
            if (item.specs?.length) specs.push(`${item.specs.length}m`);
            if (item.specs?.thickness) specs.push(`${item.specs.thickness}mm`);
            const specStr = specs.length > 0 ? specs.join(' ') : item.details;
            return specStr ? `${item.name} (${specStr})` : item.name;
        }
        if (type === 'stone') {
            const specs = [];
            if (item.specs?.weight) specs.push(`${item.specs.weight}t`);
            if (item.specs?.shape) specs.push(item.specs.shape);
            const specStr = specs.length > 0 ? specs.join(' ') : item.details;
            return specStr ? `${item.name} (${specStr})` : item.name;
        }
        if (type === 'light') {
            const sn = item.metadata?.serial_number || item.metadata?.serialNumber || item.metadata?.article_number || item.metadata?.s_n || item.id.slice(0, 8);
            return `${sn} - ${item.name}`;
        }
        return item.name;
    };

    return (
        <div className="space-y-3 relative" ref={dropdownRef}>
            <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest ml-1 flex items-center gap-2">
                <LabelIcon className="w-4 h-4" /> {label}
            </label>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-app-surface border border-app-border rounded-2xl px-6 py-4 text-app-text-primary focus:border-blue-500/50 focus:outline-none flex items-center justify-between transition-all hover:border-app-text-secondary/30 group shadow-sm active:scale-[0.99]"
            >
                <div className="flex items-center gap-4 truncate">
                    {value ? (
                        <>
                            <div className="p-2 bg-app-bg rounded-xl group-hover:bg-app-bg/80 transition-colors shrink-0">
                                {renderItemIcon(selectedItem, "md")}
                            </div>
                            <span className="font-bold truncate text-sm">{getItemLabel(selectedItem)}</span>
                        </>
                    ) : (
                        <span className="text-app-text-secondary font-medium text-sm">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={clsx("w-5 h-5 text-app-text-secondary transition-transform duration-300 shrink-0", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-app-surface border border-app-border rounded-[2rem] shadow-2xl z-[1000] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Search Input */}
                    <div className="p-4 border-b border-app-border bg-app-bg/50 backdrop-blur-md flex items-center gap-3">
                        <Search className="w-4 h-4 text-app-text-secondary" />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder={`Zoek op ${type === 'light' ? 'S/N of type' : 'naam of specs'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm text-app-text-primary placeholder:text-app-text-secondary w-full"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="p-1 hover:bg-app-bg rounded-full transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-app-text-secondary" />
                            </button>
                        )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar py-2">
                        {!searchQuery && (
                            <button
                                type="button"
                                onClick={() => { onChange(""); setIsOpen(false); setSearchQuery(""); }}
                                className={clsx(
                                    "w-full px-6 py-4 flex items-center gap-4 hover:bg-app-bg transition-colors text-left",
                                    !value && "bg-blue-500/5 text-blue-500 font-bold"
                                )}
                            >
                                <div className="w-10 h-10 rounded-xl bg-app-bg flex items-center justify-center italic text-[10px] text-app-text-secondary shrink-0 overflow-hidden">
                                    <X className="w-4 h-4 opacity-30" />
                                </div>
                                <span className="text-sm">{placeholder}</span>
                            </button>
                        )}

                        {filteredItems.length > 0 ? filteredItems.map(item => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => { onChange(item.id); setIsOpen(false); setSearchQuery(""); }}
                                className={clsx(
                                    "w-full px-6 py-4 flex items-center gap-4 hover:bg-app-bg transition-colors text-left group",
                                    value === item.id && "bg-blue-500/5 text-blue-500 font-bold"
                                )}
                            >
                                <div className="w-10 h-10 bg-app-bg rounded-xl group-hover:bg-app-surface transition-colors shrink-0 flex items-center justify-center overflow-hidden">
                                    {renderItemIcon(item, "sm")}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold truncate">
                                        {getAssetTechnicalLabel(item, type)}
                                    </span>
                                    <span className="text-[10px] text-app-text-secondary opacity-60 truncate">
                                        {type === 'chain' ? `${item.specs?.length || '?'}m ${item.specs?.thickness || '?'}mm | ${item.location}` :
                                            type === 'stone' ? `${item.specs?.weight || '?'}t ${item.specs?.shape || 'vorm'} | ${item.location}` :
                                                type === 'light' ? `${item.name} | ${item.metadata?.color || 'Onbekend'} | ${item.location}` :
                                                    item.location || item.details || ''}
                                    </span>
                                </div>
                            </button>
                        )) : (
                            <div className="p-12 text-center">
                                <Search className="w-8 h-8 text-app-text-secondary mx-auto mb-2 opacity-20" />
                                <p className="text-xs text-app-text-secondary font-medium">Geen resultaten voor "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function UitleggenClient({
    availableBuoys,
    availableChains,
    availableStones,
    availableTopmarks,
    availableLights,
    existingBuoys
}: UitleggenClientProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        lat: "",
        lng: "",
        notes: "",
        buoyId: "",
        chainId: "",
        stoneId: "",
        topmarkId: "",
        lightId: "",
        lightCharacter: "",
        isExternalCustomer: false,
        customerName: ""
    });

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const selectedBuoy = useMemo(() => availableBuoys.find(b => b.id === formData.buoyId), [formData.buoyId, availableBuoys]);
    const selectedChain = useMemo(() => availableChains.find(c => c.id === formData.chainId), [formData.chainId, availableChains]);
    const selectedStone = useMemo(() => availableStones.find(s => s.id === formData.stoneId), [formData.stoneId, availableStones]);
    const selectedLight = useMemo(() => availableLights.find(l => l.id === formData.lightId), [formData.lightId, availableLights]);

    const getBuoyDisplayColor = (b: any) => {
        if (!b) return 'Yellow';
        if (b.metadata?.color) return b.metadata.color;

        const searchString = `${b.name} ${b.details}`.toUpperCase();
        if (searchString.includes('BLAUW/GEEL')) return 'Blauw/Geel';
        if (searchString.includes('ZWART/GEEL')) return 'Zwart/Geel';
        if (searchString.includes('ROOD')) return 'Rood';
        if (searchString.includes('GROEN')) return 'Groen';
        if (searchString.includes('ZWART')) return 'Zwart';
        if (searchString.includes('BLAUW')) return 'Blauw';
        return 'Yellow';
    };

    const previewBuoy = useMemo(() => {
        const lat = parseFloat(formData.lat);
        const lng = parseFloat(formData.lng);
        if (isNaN(lat) || isNaN(lng)) return null;

        return {
            id: 'preview',
            name: formData.name || 'Nieuwe Boei',
            location: { lat, lng },
            status: 'OK',
            buoyType: {
                name: selectedBuoy?.name || 'Preview',
                color: getBuoyDisplayColor(selectedBuoy)
            },
            metadata: {
                ...(selectedBuoy?.metadata || {}),
                color: getBuoyDisplayColor(selectedBuoy)
            }
        } as any;
    }, [formData.lat, formData.lng, formData.name, selectedBuoy]);

    const allMapBuoys = useMemo(() => {
        return previewBuoy ? [...existingBuoys, previewBuoy] : existingBuoys;
    }, [existingBuoys, previewBuoy]);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            if (photoFile && photoFile.size > 20 * 1024 * 1024) {
                alert('De geselecteerde foto is te groot (max 20MB). Maak een nieuwe foto of kies een kleiner bestand.');
                setLoading(false);
                return;
            }

            // The action expects (prevState, formData)
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('lat', formData.lat);
            submitData.append('lng', formData.lng);
            submitData.append('notes', formData.notes);
            submitData.append('buoy_id', formData.buoyId);
            if (formData.chainId) submitData.append('chain_id', formData.chainId);
            if (formData.stoneId) submitData.append('stone_id', formData.stoneId);
            if (formData.lightId) submitData.append('lamp_id', formData.lightId);
            if (formData.topmarkId) submitData.append('topmark_id', formData.topmarkId);
            if (formData.lightCharacter) submitData.append('light_character', formData.lightCharacter);
            if (formData.isExternalCustomer) {
                submitData.append('is_external_customer', 'true');
                submitData.append('customer_name', formData.customerName);
            }
            if (photoFile) submitData.append('photo', photoFile);

            const result = await deployBuoyAction(null, submitData);

            if (result.success) {
                router.push('/uitgelegd');
                router.refresh();
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const isStep1Valid = !!formData.buoyId;
    const isStep2Valid = formData.name.length > 2 && formData.lat && formData.lng;

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 h-full flex flex-col">
            {/* PROGRESS BAR */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-black text-app-text-primary tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Ship className="w-8 h-8 text-blue-500" />
                        </div>
                        Boei Uitleggen
                    </h1>
                    <div className="text-xs font-bold text-app-text-secondary uppercase tracking-widest bg-app-surface px-3 py-1 rounded-full border border-app-border">
                        Stap {step} van 4
                    </div>
                </div>
                <div className="relative h-1 bg-app-border rounded-full flex justify-between">
                    <div
                        className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-500 rounded-full"
                        style={{ width: `${((step - 1) / 3) * 100}%` }}
                    />
                    {[1, 2, 3, 4].map(s => (
                        <div
                            key={s}
                            className={clsx(
                                "w-6 h-6 rounded-full -mt-2.5 z-10 flex items-center justify-center text-[10px] font-black transition-all duration-300 border-2",
                                s <= step ? "bg-blue-500 border-blue-500 text-white" : "bg-app-bg border-app-border text-app-text-secondary"
                            )}
                        >
                            {s < step ? <Check className="w-3 h-3" /> : s}
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-500 flex items-center gap-3">
                    <X className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">

                {/* STEP 1: BOEI SELECTIE */}
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div>
                            <h2 className="text-2xl font-bold text-app-text-primary mb-2">Welke boei leggen we uit?</h2>
                            <p className="text-app-text-secondary">Selecteer een boei uit de voorraad om mee te beginnen.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableBuoys.map(buoy => (
                                <div
                                    key={buoy.id}
                                    onClick={() => setFormData({ ...formData, buoyId: buoy.id })}
                                    className={clsx(
                                        "p-6 rounded-3xl border-2 cursor-pointer transition-all relative group overflow-hidden",
                                        formData.buoyId === buoy.id
                                            ? "bg-blue-500/5 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                                            : "bg-app-surface border-app-border hover:border-app-text-secondary/50"
                                    )}
                                >
                                    {formData.buoyId === buoy.id && (
                                        <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className="p-4 bg-white/5 rounded-2xl">
                                            <BuoyIcon color={getBuoyDisplayColor(buoy)} size="md" />
                                        </div>
                                        <div>
                                            <div className="font-black text-app-text-primary uppercase tracking-tight leading-tight">{buoy.name}</div>
                                            <div className="text-[10px] text-app-text-secondary font-bold uppercase tracking-widest mt-1">{buoy.details}</div>
                                        </div>
                                        <div className="text-xs px-3 py-1 bg-app-bg border border-app-border rounded-full text-app-text-secondary">
                                            ID: {buoy.id.slice(0, 8)} | {buoy.location}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: LOCATIE */}
                {step === 2 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-app-text-primary mb-2">Waar leggen we de boei uit?</h2>
                                <p className="text-app-text-secondary">Geef de locatie een naam en vul de GPS coördinaten in.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest ml-1">Positie Naam</label>
                                    <input
                                        type="text"
                                        placeholder="bijv. Z-Boei Oosterweel"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-app-surface border border-app-border rounded-2xl px-6 py-4 text-app-text-primary focus:border-blue-500/50 focus:outline-none transition-all text-xl font-bold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <Navigation className="w-3 h-3" /> Latitude
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="51.2345"
                                            value={formData.lat}
                                            onChange={e => setFormData({ ...formData, lat: e.target.value })}
                                            className="w-full bg-app-surface border border-app-border rounded-2xl px-6 py-4 text-app-text-primary focus:border-blue-500/50 focus:outline-none transition-all font-mono font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <Navigation className="w-3 h-3" /> Longitude
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="4.4123"
                                            value={formData.lng}
                                            onChange={e => setFormData({ ...formData, lng: e.target.value })}
                                            className="w-full bg-app-surface border border-app-border rounded-2xl px-6 py-4 text-app-text-primary focus:border-blue-500/50 focus:outline-none transition-all font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest ml-1">Extra Notities</label>
                                    <textarea
                                        placeholder="Beschrijf de situatie ter plekke..."
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full bg-app-surface border border-app-border rounded-2xl px-6 py-4 text-app-text-primary focus:border-blue-500/50 focus:outline-none transition-all min-h-[120px] resize-none"
                                    />
                                </div>

                                {/* Externe Klant */}
                                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={formData.isExternalCustomer}
                                                onChange={e => setFormData({ ...formData, isExternalCustomer: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </div>
                                        <span className="text-sm font-bold text-app-text-primary group-hover:text-blue-600 transition-colors">Markeren als Externe Klant</span>
                                    </label>

                                    {formData.isExternalCustomer && (
                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-1.5 block">Klantnaam / Bedrijf</label>
                                            <input
                                                type="text"
                                                placeholder="Voer naam in..."
                                                value={formData.customerName}
                                                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm text-app-text-primary focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Photo Upload */}
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest ml-1">Foto van de locatie / boei</label>
                                    {photoPreview ? (
                                        <div className="relative aspect-video rounded-3xl overflow-hidden border border-app-border bg-black group">
                                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="p-3 bg-white rounded-full text-black hover:scale-110 transition-transform"
                                                >
                                                    <Camera className="w-5 h-5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                                    className="p-3 bg-red-600 rounded-full text-white hover:scale-110 transition-transform"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full aspect-video rounded-3xl border-2 border-dashed border-app-border flex flex-col items-center justify-center gap-3 text-app-text-secondary hover:border-blue-500 hover:text-blue-500 hover:bg-blue-500/5 transition-all"
                                        >
                                            <Camera className="w-10 h-10 opacity-20" />
                                            <div className="text-center">
                                                <div className="text-sm font-black uppercase tracking-widest mb-1">Maak foto / Upload</div>
                                                <div className="text-[10px] opacity-60">Optioneel: leg de situatie vast</div>
                                            </div>
                                        </button>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handlePhotoChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-app-surface rounded-[2rem] border border-app-border overflow-hidden flex flex-col h-[500px] shadow-inner relative group">
                            <BuoyMap
                                buoys={allMapBuoys}
                                selectedBuoyId={previewBuoy ? 'preview' : null}
                            />
                            {!previewBuoy && (
                                <div className="absolute inset-0 bg-app-bg/60 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center text-app-text-secondary z-10 pointer-events-none">
                                    <MapIcon className="w-16 h-16 mb-4 opacity-10 animate-bounce" />
                                    <p className="max-w-xs text-sm font-bold opacity-40">Vul GPS coördinaten in om de locatie op de kaart te verifiëren.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: COMPONENTEN */}
                {step === 3 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-10">
                            <div>
                                <h2 className="text-2xl font-bold text-app-text-primary mb-2">Welke onderdelen voegen we toe?</h2>
                                <p className="text-app-text-secondary">Kies de ketting, steen en lamp voor de assemblage.</p>
                            </div>

                            <div className="space-y-8">
                                <VisualDropdown
                                    label="Ketting"
                                    icon={LinkIcon}
                                    items={availableChains}
                                    value={formData.chainId}
                                    onChange={(v) => setFormData({ ...formData, chainId: v })}
                                    type="chain"
                                    placeholder="Geen ketting (of hergebruik)"
                                />

                                <VisualDropdown
                                    label="Steen"
                                    icon={Anchor}
                                    items={availableStones}
                                    value={formData.stoneId}
                                    onChange={(v) => setFormData({ ...formData, stoneId: v })}
                                    type="stone"
                                    placeholder="Geen steen"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-6">
                                        <VisualDropdown
                                            label="Lamp"
                                            icon={Lightbulb}
                                            items={availableLights}
                                            value={formData.lightId}
                                            onChange={(v) => {
                                                const lamp = availableLights.find(l => l.id === v);
                                                setFormData({
                                                    ...formData,
                                                    lightId: v,
                                                    lightCharacter: lamp?.metadata?.light_character || lamp?.metadata?.lamp_character || formData.lightCharacter
                                                });
                                            }}
                                            type="light"
                                            placeholder="Geen lamp"
                                        />

                                        {formData.lightId && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 w-full">
                                                <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest ml-1 mb-2 block">Licht Karakter</label>
                                                <LightCharacterInput
                                                    value={formData.lightCharacter}
                                                    onChange={val => setFormData({ ...formData, lightCharacter: val })}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <VisualDropdown
                                        label="Topteken"
                                        icon={Hexagon}
                                        items={availableTopmarks}
                                        value={formData.topmarkId}
                                        onChange={(v) => setFormData({ ...formData, topmarkId: v })}
                                        type="topmark"
                                        placeholder="Geen topteken"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-app-bg rounded-[2rem] border border-app-border p-10 flex flex-col items-center justify-center text-center space-y-6">
                            <Sparkles className="w-16 h-16 text-blue-500/20" />
                            <div className="space-y-2">
                                <h3 className="font-bold text-app-text-primary">Assemblage Preview</h3>
                                <p className="text-xs text-app-text-secondary">Zodra je items kiest, worden ze automatisch gekoppeld aan deze boei.</p>
                            </div>

                            <div className="w-full space-y-3">
                                {formData.buoyId && (
                                    <div className="flex items-center justify-between p-3 bg-app-surface rounded-xl text-xs border border-app-border/50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <BuoyIcon color={getBuoyDisplayColor(selectedBuoy)} size="sm" />
                                            <span className="text-app-text-secondary font-medium">Boei</span>
                                        </div>
                                        <span className="font-black text-app-text-primary truncate ml-4 uppercase tracking-tighter">{selectedBuoy?.name}</span>
                                    </div>
                                )}
                                {formData.chainId && (
                                    <div className="flex items-center justify-between p-3 bg-app-surface rounded-xl text-xs border border-app-border/50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <ChainIcon color={selectedChain?.name || 'Zwart'} size="sm" />
                                            <span className="text-app-text-secondary font-medium">Ketting</span>
                                        </div>
                                        <span className="font-black text-app-text-primary truncate ml-4 truncate flex-1 text-right">{getAssetTechnicalLabel(selectedChain, 'chain')}</span>
                                    </div>
                                )}
                                {formData.stoneId && (
                                    <div className="flex items-center justify-between p-3 bg-app-surface rounded-xl text-xs border border-app-border/50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <StoneIcon shape={selectedStone?.specs?.shape || 'Rond'} size="sm" />
                                            <span className="text-app-text-secondary font-medium">Steen</span>
                                        </div>
                                        <span className="font-black text-app-text-primary truncate ml-4 truncate flex-1 text-right uppercase tracking-tighter">{getAssetTechnicalLabel(selectedStone, 'stone')}</span>
                                    </div>
                                )}
                                {formData.lightId && (
                                    <div className="flex items-center justify-between p-3 bg-app-surface rounded-xl text-xs border border-app-border/50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <Lightbulb className={clsx("w-4 h-4", getLightColorClass(selectedLight))} />
                                            <span className="text-app-text-secondary font-medium">Lamp</span>
                                        </div>
                                        <span className="font-black text-app-text-primary truncate ml-4 truncate flex-1 text-right">{getAssetTechnicalLabel(selectedLight, 'light')}</span>
                                    </div>
                                )}
                                {formData.topmarkId && (
                                    <div className="flex items-center justify-between p-3 bg-app-surface rounded-xl text-xs border border-app-border/50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <Hexagon className="w-4 h-4 text-emerald-500" />
                                            <span className="text-app-text-secondary font-medium">Topteken</span>
                                        </div>
                                        <span className="font-black text-app-text-primary truncate ml-4 truncate flex-1 text-right">{availableTopmarks.find(t => t.id === formData.topmarkId)?.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: OPSOMMING */}
                {step === 4 && (
                    <div className="max-w-4xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center">
                            <div className="inline-flex p-4 bg-green-500/10 rounded-3xl mb-4">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-3xl font-black text-app-text-primary">Alles klaar voor uitlegging?</h2>
                            <p className="text-app-text-secondary mt-2">Controleer de gegevens een laatste keer voor we de boei registreren.</p>
                        </div>

                        <div className="bg-app-surface rounded-[2rem] border border-app-border overflow-hidden shadow-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2">
                                <div className="p-8 space-y-8 border-b md:border-b-0 md:border-r border-app-border">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">Locatie & Naam</h3>
                                        <div className="space-y-1">
                                            <div className="text-2xl font-black text-app-text-primary">{formData.name}</div>
                                            <div className="flex items-center gap-2 text-app-text-secondary font-mono text-xs">
                                                <MapPin className="w-3 h-3" />
                                                {formData.lat}, {formData.lng}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">Notities</h3>
                                        <p className="text-sm text-app-text-secondary leading-relaxed italic">
                                            {formData.notes || "Geen extra notities toegevoegd."}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-8 bg-app-bg/30 space-y-6">
                                    <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">Configuratie</h3>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border flex items-center justify-center">
                                                <BuoyIcon color={getBuoyDisplayColor(selectedBuoy)} size="md" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[10px] text-app-text-secondary font-bold uppercase tracking-widest">Boei</div>
                                                <div className="text-sm font-black text-app-text-primary uppercase">{selectedBuoy?.name}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border flex items-center justify-center">
                                                {formData.chainId ? <ChainIcon color={selectedChain?.name || 'Zwart'} size="md" /> : <LinkIcon className="w-5 h-5 text-blue-500" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[10px] text-app-text-secondary font-bold uppercase tracking-widest">Ketting</div>
                                                <div className="text-sm font-bold text-app-text-primary">
                                                    {formData.chainId ? getAssetTechnicalLabel(selectedChain, 'chain') : "Geen ketting"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border flex items-center justify-center">
                                                {formData.stoneId ? <StoneIcon shape={selectedStone?.specs?.shape || 'Rond'} size="md" /> : <Anchor className="w-5 h-5 text-slate-500" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[10px] text-app-text-secondary font-bold uppercase tracking-widest">Steen</div>
                                                <div className="text-sm font-bold text-app-text-primary">
                                                    {formData.stoneId ? getAssetTechnicalLabel(selectedStone, 'stone') : "Geen steen"}
                                                </div>
                                            </div>
                                        </div>

                                        {formData.lightId && (
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border flex items-center justify-center">
                                                    <Lightbulb className={clsx("w-5 h-5", getLightColorClass(selectedLight))} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] text-app-text-secondary font-bold uppercase tracking-widest">Lamp</div>
                                                    <div className="text-sm font-bold text-app-text-primary">
                                                        {getAssetTechnicalLabel(selectedLight, 'light')}
                                                        {formData.lightCharacter && <span className="text-blue-500 ml-2">[{formData.lightCharacter}]</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {formData.topmarkId && (
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-app-surface border border-app-border flex items-center justify-center">
                                                    <Hexagon className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] text-app-text-secondary font-bold uppercase tracking-widest">Topteken</div>
                                                    <div className="text-sm font-bold text-app-text-primary">
                                                        {availableTopmarks.find(t => t.id === formData.topmarkId)?.name}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ACTION FOOTER */}
            <div className="mt-12 py-6 border-t border-app-border flex items-center justify-between">
                <button
                    onClick={prevStep}
                    disabled={step === 1 || loading}
                    className="flex items-center gap-2 px-6 py-3 text-app-text-secondary font-bold hover:text-app-text-primary transition-all disabled:opacity-30"
                >
                    <ChevronLeft className="w-5 h-5" /> Vorige
                </button>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/uitgelegd')}
                        className="px-6 py-3 text-app-text-secondary/50 font-bold hover:text-app-text-secondary transition-all"
                    >
                        Annuleren
                    </button>
                    {step < 4 ? (
                        <button
                            onClick={nextStep}
                            disabled={step === 1 ? !isStep1Valid : step === 2 ? !isStep2Valid : false}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-lg hover:translate-x-1 disabled:opacity-50 disabled:grayscale disabled:hover:translate-x-0"
                        >
                            Volgende Stap <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Bezig...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" /> Boei Registreren
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
