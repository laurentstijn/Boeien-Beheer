import { linkLampToBuoy, unlinkLampFromBuoy, linkChainToBuoy, unlinkChainFromBuoy, linkStoneToBuoy, unlinkStoneFromBuoy, uploadBuoyPhoto } from '@/app/actions';
import { Lightbulb, Unplug, Link, X, Save, Trash2, MapPin, Anchor, Component, Building2, FileText, ChevronDown, Printer, Undo2, Camera, Image as ImageIcon, Loader2, Upload, Layers } from 'lucide-react';
import { BuoyIcon } from '@/components/BuoyIcon';
import { LightCharacterInput } from '@/components/LightCharacterInput';
import AssetPicker from '@/components/AssetPicker';
import { SearchableSelect } from '@/components/SearchableSelect';
import React, { useState, useRef, useEffect } from 'react';
import { DeployedBuoy } from '@/lib/data';
import clsx from 'clsx';
import { AssetDialog } from '@/components/AssetDialog';

const SOORT_OPTIONS = [
    { value: 'spits', label: 'Spits (Groen)', color: 'groen' },
    { value: 'plat', label: 'Plat (Rood)', color: 'rood' },
    { value: 'noord-cardinaal', label: 'Noord Cardinaal', color: 'noord' },
    { value: 'zuid-cardinaal', label: 'Zuid Cardinaal', color: 'zuid' },
    { value: 'oost-cardinaal', label: 'Oost Cardinaal', color: 'oost' },
    { value: 'west-cardinaal', label: 'West Cardinaal', color: 'west' },
    { value: 'wrak', label: 'Wrak (Blauw/Geel)', color: 'blauw/geel' },
    { value: 'bijzonder', label: 'Bijzonder (Geel)', color: 'geel' },
    { value: 'markering', label: 'Markering (Zwart)', color: 'zwart' },
];

function CustomBuoySelect({
    value,
    onChange,
    options,
    placeholder
}: {
    value: string,
    onChange: (val: string) => void,
    options: { value: string, label: string, color: string }[],
    placeholder: string
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border bg-app-bg text-sm text-left hover:border-blue-400 transition-colors shadow-sm min-h-[40px]"
            >
                {selectedOption && <BuoyIcon color={selectedOption.color} type={selectedOption.value} size="sm" className="shrink-0" />}
                <span className={clsx("flex-1 truncate", !selectedOption && "text-app-text-secondary")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={clsx("w-4 h-4 text-app-text-secondary shrink-0 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="absolute z-[100] w-full mt-1 bg-app-surface border border-app-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={clsx(
                                    "w-full text-left px-3 py-2 text-xs flex items-center gap-3 hover:bg-app-surface-hover transition-all pointer-events-auto",
                                    value === opt.value && "bg-blue-50 text-blue-700 font-bold"
                                )}
                            >
                                <BuoyIcon color={opt.color} type={opt.value} size="sm" className="shrink-0" />
                                <span className="flex-1 truncate">{opt.label}</span>
                                {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface EditDeployedBuoyDialogProps {
    buoy: DeployedBuoy;
    buoyConfigurations: any[];
    availableLamps: any[];
    availableChains?: any[];
    availableStones?: any[];
    existingCustomers?: string[];
    onClose: () => void;
    onUpdate: (updatedBuoy: DeployedBuoy) => void;
    onDelete: (id: string) => void;
}

export default function EditDeployedBuoyDialog({
    buoy,
    buoyConfigurations,
    availableLamps,
    availableChains = [],
    availableStones = [],
    existingCustomers = [],
    onClose,
    onUpdate,
    onDelete
}: EditDeployedBuoyDialogProps) {
    const [localAvailableLamps, setLocalAvailableLamps] = useState(availableLamps);
    const [localAvailableChains, setLocalAvailableChains] = useState(availableChains || []);
    const [localAvailableStones, setLocalAvailableStones] = useState(availableStones || []);

    const [creationCategory, setCreationCategory] = useState<string | null>(null);
    const [creationItemTypes, setCreationItemTypes] = useState<any[]>([]);

    const handleOpenCreatePopup = async (category: string) => {
        setCreationCategory(category);
        try {
            const res = await fetch(`/api/inventory/item-types?category=${category}`);
            if (res.ok) {
                const data = await res.json();
                setCreationItemTypes(data);
            }
        } catch (err) {
            console.error("Failed to fetch item types", err);
        }
    };

    const loadStock = async (category: string) => {
        try {
            const res = await fetch(`/api/inventory/available?category=${category}`);
            if (!res.ok) throw new Error('Failed to fetch stock');
            const data = await res.json();
            if (category === 'Lamp') setLocalAvailableLamps(data);
            if (category === 'Ketting') setLocalAvailableChains(data);
            if (category === 'Steen') setLocalAvailableStones(data);
        } catch (err) {
            console.error('Error loading stock for', category, err);
        }
    };

    const [name, setName] = useState(buoy.name);
    const [lat, setLat] = useState(buoy.location.lat.toString());
    const [lng, setLng] = useState(buoy.location.lng.toString());
    const [notes, setNotes] = useState(buoy.notes);
    const [status, setStatus] = useState(buoy.status);
    const [tideRestriction, setTideRestriction] = useState(buoy.tideRestriction || 'Altijd');
    const [lightCharacter, setLightCharacter] = useState(buoy.lightCharacter || '');
    const [selectedConfigId, setSelectedConfigId] = useState(() => {
        if (buoy.buoyConfigId) return buoy.buoyConfigId;
        // Try to find a match by name in buoyConfigurations
        const modelName = buoy.metadata?.model || buoy.buoyType?.name;
        if (!modelName) return '';

        const match = buoyConfigurations.find(c =>
            modelName.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(modelName.toLowerCase())
        );
        return match ? match.id : '';
    });

    const [selectedColor, setSelectedColor] = useState(() => {
        const color = (buoy.metadata?.color || buoy.buoyType?.color || 'geel').toLowerCase().replace('-', '/');
        // If color is just 'geel' but we have a boei_soort like 'spits', override to green
        if (color === 'geel' || color === 'yellow') {
            if (buoy.metadata?.boei_soort === 'spits') return 'groen';
            if (buoy.metadata?.boei_soort === 'plat') return 'rood';
        }
        return color;
    });
    // Initialize boeiSoort based on metadata OR infer from color if metadata is missing
    const initialBoeiSoort = () => {
        if (buoy.metadata?.boei_soort) return buoy.metadata.boei_soort;

        const color = (buoy.buoyType?.color || 'geel').toLowerCase();
        if (color === 'groen') return 'spits';
        if (color === 'rood') return 'plat';
        if (color === 'noord') return 'noord-cardinaal';
        if (color === 'zuid') return 'zuid-cardinaal';
        if (color === 'oost') return 'oost-cardinaal';
        if (color === 'west') return 'west-cardinaal';
        if (color === 'zwart') return 'markering';
        if (color === 'blauw/geel' || color === 'yellow/blue') return 'wrak';
        return 'bijzonder';
    };

    const [boeiSoort, setBoeiSoort] = useState<string>(initialBoeiSoort());
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'lamp' | 'chain' | 'stone'>('lamp');

    const uniqueBaseConfigs = React.useMemo(() => {
        const map = new Map<string, any>();
        buoyConfigurations?.forEach(config => {
            const baseName = config.name.replace(/\s+(Rood|Groen|Geel|Blauw|Zwart|Noord|Oost|Zuid|West|Wit)$/i, '').trim();
            if (!map.has(baseName) || config.id === selectedConfigId) {
                map.set(baseName, { ...config, name: baseName });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [buoyConfigurations, selectedConfigId]);

    // Externe Klant
    const [isExternalCustomer, setIsExternalCustomer] = useState<boolean>(!!buoy.metadata?.external_customer);
    const [customerName, setCustomerName] = useState<string>(buoy.metadata?.customer_name || '');
    const [customerDeployDate, setCustomerDeployDate] = useState<string>(
        buoy.metadata?.customer_deploy_date ||
        (buoy.date ? (typeof buoy.date === 'string' ? buoy.date.split('T')[0] : '') : '')
    );
    const [customerPickupDate, setCustomerPickupDate] = useState<string>(buoy.metadata?.customer_pickup_date || '');

    // Linking State
    const [selectedComponentId, setSelectedComponentId] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
    const [unlinkTargetStatus, setUnlinkTargetStatus] = useState('in_stock');
    const [showReportPopup, setShowReportPopup] = useState(false);
    const [showCustomerReportPopup, setShowCustomerReportPopup] = useState(false);

    const [photoUrl, setPhotoUrl] = useState<string>(buoy.metadata?.photo_url || '');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const fb = new FormData();
        fb.append('photo', file);
        fb.append('buoyId', buoy.id);

        try {
            const result = await uploadBuoyPhoto(fb);
            if (result.success && result.url) {
                setPhotoUrl(result.url);
            } else {
                alert('Fout bij opladen foto: ' + result.message);
            }
        } catch (err) {
            console.error(err);
            alert('Er is een fout opgetreden bij het uploaden.');
        } finally {
            setIsUploading(false);
        }
    };
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const customerIframeRef = useRef<HTMLIFrameElement>(null);

    const handlePrint = () => {
        if (iframeRef.current) {
            const contentWindow = iframeRef.current.contentWindow;
            if (contentWindow) {
                contentWindow.focus();
                contentWindow.print();
            }
        }
    };

    const handleCustomerPrint = () => {
        if (customerIframeRef.current) {
            const contentWindow = customerIframeRef.current.contentWindow;
            if (contentWindow) {
                contentWindow.focus();
                contentWindow.print();
            }
        }
    };

    const currentLamp = buoy.metadata?.light;
    const currentChain = buoy.metadata?.chain;
    const currentStone = buoy.metadata?.sinker;

    const getCurrentComponent = () => {
        if (activeTab === 'lamp') return currentLamp;
        if (activeTab === 'chain') return currentChain;
        if (activeTab === 'stone') return currentStone;
    };

    const hasComponent = (comp: any) => {
        if (!comp) return false;
        return !!(comp.asset_id || comp.serialNumber || comp.serial_number || comp.type || comp.name);
    };

    const getAvailableComponents = () => {
        if (activeTab === 'lamp') return localAvailableLamps;
        if (activeTab === 'chain') return localAvailableChains;
        if (activeTab === 'stone') return localAvailableStones;
        return [];
    };

    const handleLink = async () => {
        if (!selectedComponentId) return;
        setIsLinking(true);
        try {
            let result;
            if (activeTab === 'lamp') result = await linkLampToBuoy(buoy.id, selectedComponentId);
            if (activeTab === 'chain') result = await linkChainToBuoy(buoy.id, selectedComponentId);
            if (activeTab === 'stone') result = await linkStoneToBuoy(buoy.id, selectedComponentId);

            if (result?.success) {
                const linkedItem = getAvailableComponents().find(i => i.id === selectedComponentId);
                const linkedType = linkedItem?.name || (Array.isArray(linkedItem?.items) ? linkedItem?.items[0]?.name : linkedItem?.items?.name);

                let newMetadata = { ...buoy.metadata };
                if (activeTab === 'lamp') newMetadata.light = { ...linkedItem?.metadata, type: linkedType || 'Onbekend', brand: linkedItem?.metadata?.brand || linkedItem?.brand, color: linkedItem?.metadata?.color || linkedItem?.metadata?.lamp_color || linkedItem?.color, ble: linkedItem?.metadata?.ble || false, gps: linkedItem?.metadata?.gps || false, asset_id: selectedComponentId };
                if (activeTab === 'chain') newMetadata.chain = { ...linkedItem?.metadata, type: linkedType || 'Onbekend', brand: linkedItem?.metadata?.brand || linkedItem?.brand, asset_id: selectedComponentId };
                if (activeTab === 'stone') newMetadata.sinker = { ...linkedItem?.metadata, type: linkedType || 'Onbekend', brand: linkedItem?.metadata?.brand || linkedItem?.brand, asset_id: selectedComponentId };

                onUpdate({ ...buoy, metadata: newMetadata });
                setSelectedComponentId('');
            } else {
                alert(result?.message || 'Fout bij koppelen.');
            }
        } catch (error) {
            console.error(error);
            alert('Fout bij koppelen.');
        } finally {
            setIsLinking(false);
        }
    };

    const initiateUnlink = () => {
        setShowUnlinkDialog(true);
        setUnlinkTargetStatus('in_stock');
    };

    const handleUnlinkConfirm = async () => {
        const component = getCurrentComponent();
        if (!component) return;

        setIsLinking(true);
        try {
            let result;
            if (component.asset_id) {
                // Real asset link - use specialized unlink actions
                if (activeTab === 'lamp') result = await unlinkLampFromBuoy(buoy.id, component.asset_id, unlinkTargetStatus);
                if (activeTab === 'chain') result = await unlinkChainFromBuoy(buoy.id, component.asset_id, unlinkTargetStatus);
                if (activeTab === 'stone') result = await unlinkStoneFromBuoy(buoy.id, component.asset_id, unlinkTargetStatus);
            } else {
                // Legacy / Imported data (only in metadata) - just remove from metadata
                const newMetadata = { ...buoy.metadata };
                if (activeTab === 'lamp') delete newMetadata.light;
                if (activeTab === 'chain') delete newMetadata.chain;
                if (activeTab === 'stone') delete newMetadata.sinker;

                const response = await fetch(`/api/deployed/${buoy.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ metadata: newMetadata })
                });

                if (response.ok) {
                    result = { success: true };
                } else {
                    result = { success: false, message: 'Fout bij verwijderen van legacy data.' };
                }
            }

            if (result?.success) {
                const newMetadata = { ...buoy.metadata };
                if (activeTab === 'lamp') delete newMetadata.light;
                if (activeTab === 'chain') delete newMetadata.chain;
                if (activeTab === 'stone') delete newMetadata.sinker;

                onUpdate({ ...buoy, metadata: newMetadata });
                setShowUnlinkDialog(false);
            } else {
                alert(result?.message);
            }
        } catch (error) {
            console.error(error);
            alert('Fout bij ontkoppelen.');
        } finally {
            setIsLinking(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const cleanLat = lat.trim().replace(',', '.');
            const cleanLng = lng.trim().replace(',', '.');

            const updates = {
                name: name.trim(),
                location: `(${cleanLat},${cleanLng})`,
                notes: notes.trim(),
                status,
                tide_restriction: tideRestriction,
                light_character: lightCharacter,
                buoy_config_id: selectedConfigId || null,
                metadata: {
                    ...buoy.metadata,
                    color: selectedColor,
                    boei_soort: boeiSoort,
                    external_customer: isExternalCustomer,
                    customer_name: isExternalCustomer ? customerName : null,
                    customer_deploy_date: isExternalCustomer ? customerDeployDate : null,
                    customer_pickup_date: isExternalCustomer ? customerPickupDate : null,
                    photo_url: photoUrl
                }
            };

            const response = await fetch(`/api/deployed/${buoy.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                onUpdate({
                    ...buoy,
                    name,
                    location: { lat: parseFloat(lat), lng: parseFloat(lng) },
                    notes,
                    status,
                    tideRestriction,
                    lightCharacter,
                    buoyConfigId: selectedConfigId,
                    buoyType: {
                        name: buoyConfigurations.find(c => c.id === selectedConfigId)?.name || 'Onbekend',
                        color: selectedColor
                    },
                    metadata: {
                        ...buoy.metadata,
                        color: selectedColor,
                        boei_soort: boeiSoort,
                        external_customer: isExternalCustomer,
                        customer_name: isExternalCustomer ? customerName : null,
                        customer_deploy_date: isExternalCustomer ? customerDeployDate : null,
                        customer_pickup_date: isExternalCustomer ? customerPickupDate : null,
                        photo_url: photoUrl
                    }
                });
                onClose();
            } else {
                alert('Fout bij opslaan van wijzigingen');
            }
        } catch (error) {
            console.error('Error updating buoy:', error);
            alert('Er is een fout opgetreden');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        onDelete(buoy.id);
        onClose();
    };

    const renderEmptyState = (type: string) => (
        <div className="text-center py-8 px-4 border-2 border-dashed border-app-border rounded-xl">
            <div className="w-12 h-12 bg-app-surface rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-app-text-secondary">
                {type === 'lamp' ? <Lightbulb className="w-6 h-6 opacity-50" /> : type === 'chain' ? <Link className="w-6 h-6 opacity-50" /> : <Anchor className="w-6 h-6 opacity-50" />}
            </div>
            <h3 className="text-sm font-bold text-app-text-primary mb-1">Geen {type === 'lamp' ? 'lamp' : type === 'chain' ? 'ketting' : 'steen'} gekoppeld</h3>
            <p className="text-xs text-app-text-secondary mb-4">Koppel een {type === 'lamp' ? 'lamp' : type === 'chain' ? 'ketting' : 'steen'} uit de voorraad.</p>

            <div className="flex flex-col gap-2 relative">
                <AssetPicker
                    items={getAvailableComponents()}
                    value={selectedComponentId}
                    onChange={setSelectedComponentId}
                    placeholder={`Selecteer ${activeTab === 'lamp' ? 'lamp' : activeTab === 'chain' ? 'ketting' : 'steen'}...`}
                    className="mb-1"
                    onAddNew={() => {
                        const catMap: Record<string, string> = { 'lamp': 'Lamp', 'chain': 'Ketting', 'stone': 'Steen' };
                        handleOpenCreatePopup(catMap[activeTab]);
                    }}
                />

                <button
                    onClick={handleLink}
                    disabled={!selectedComponentId || isLinking}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLinking ? 'Koppelen...' : <><Link className="w-3 h-3" /> Koppel</>}
                </button>
            </div>
        </div>
    );

    const renderLinkedState = (component: any, type: string) => {
        // Find best color fallback
        let displayColor = component.color || component.metadata?.color || component.metadata?.lamp_color || '-';
        if (displayColor === '-' || displayColor.includes('???')) {
            // Try to infer from name or article string if any
            const str = ((component.type || '') + ' ' + (component.name || '')).toLowerCase();
            if (str.includes('groen')) displayColor = 'Groen';
            else if (str.includes('rood')) displayColor = 'Rood';
            else if (str.includes('geel')) displayColor = 'Geel';
            else if (str.includes('zwart')) displayColor = 'Zwart';

            // If still unknown and it's a lamp, infer from the buoy color itself
            if (displayColor === '-' && type === 'lamp') {
                const bColor = selectedColor || (buoy.buoyType?.color || 'geel').toLowerCase();
                displayColor = bColor.charAt(0).toUpperCase() + bColor.slice(1);
            }
        }

        return (
            <div className="bg-app-surface p-4 rounded-xl border border-app-border shadow-sm">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center border bg-blue-50/50 border-blue-100 text-blue-600")}>
                            {type === 'lamp' ? <Lightbulb className="w-5 h-5" /> : type === 'chain' ? <Link className="w-5 h-5" /> : <Anchor className="w-5 h-5" />}
                        </div>
                        <div>
                            {type === 'lamp' ? (
                                <>
                                    <h3 className="font-bold text-app-text-primary text-sm font-mono">{component.serialNumber || component.serial_number || component.article_number || component.asset_id?.slice(0, 8) || 'Geen ID'}</h3>
                                    <p className="text-xs text-app-text-secondary">{component.brand || component.name || component.type || 'Geen merk'}</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-bold text-app-text-primary text-sm">{component.type || component.name || component.brand || 'Onbekend'}</h3>
                                    <p className="text-xs text-app-text-secondary font-mono">{component.serialNumber || component.serial_number || component.article_number || component.asset_id?.slice(0, 8) || 'Geen ID'}</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className={clsx(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold border shadow-sm flex items-center gap-1",
                        component.asset_id
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                    )}>
                        <div className={clsx("w-1.5 h-1.5 rounded-full", component.asset_id ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
                        {component.asset_id ? 'Gekoppeld' : 'Geïmporteerd'}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-app-bg p-2 rounded-lg border border-app-border/50">
                        <span className="text-[10px] text-app-text-secondary block uppercase font-bold">Type</span>
                        <span className="text-xs font-semibold text-app-text-primary">{component.type || component.article_number || '-'}</span>
                    </div>
                    {type === 'lamp' && (
                        <>
                            <div className="bg-app-bg p-2 rounded-lg border border-app-border/50">
                                <span className="text-[10px] text-app-text-secondary block uppercase font-bold">Kleur</span>
                                <span className="text-xs font-semibold text-app-text-primary">{displayColor}</span>
                            </div>
                            <div className="bg-app-bg p-2 rounded-lg border border-app-border/50">
                                <span className="text-[10px] text-app-text-secondary block uppercase font-bold">Licht</span>
                                <span className="text-xs font-semibold text-app-text-primary">{component.light_character || lightCharacter || '-'}</span>
                            </div>
                        </>
                    )}
                </div>

                <button
                    onClick={initiateUnlink}
                    disabled={isLinking}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-500 hover:bg-red-50 hover:border-red-200 rounded-lg border border-red-100 transition-all active:scale-[0.98]"
                >
                    {isLinking ? 'Bezig...' : <><Unplug className="w-3 h-3" /> Ontkoppelen</>}
                </button>
            </div>
        )
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-app-surface w-full max-w-md rounded-2xl border border-app-border shadow-2xl animate-in fade-in zoom-in duration-200 lg:max-w-4xl lg:h-[80vh] flex flex-col lg:flex-row overflow-hidden" style={{ maxHeight: '90dvh' }}>
                {/* Left Column: Main Form */}
                <div className="flex flex-col min-h-0 lg:w-1/2 overflow-hidden border-b lg:border-b-0 lg:border-r border-app-border flex-1 lg:flex-none">
                    <div className="p-6 border-b border-app-border flex items-center justify-between bg-app-surface shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-app-text-primary">Boei Aanpassen</h2>
                            <p className="text-xs text-app-text-secondary mt-1">Wijzig gegevens van {buoy.name}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-app-surface-hover rounded-full transition-colors lg:hidden">
                            <X className="w-5 h-5 text-app-text-secondary" />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                        <div>
                            <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Naam</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Latitude</label>
                                <input
                                    type="text"
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Longitude</label>
                                <input
                                    type="text"
                                    value={lng}
                                    onChange={(e) => setLng(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Model</label>
                                <SearchableSelect
                                    value={selectedConfigId}
                                    onChange={setSelectedConfigId}
                                    options={[{ value: '', label: 'Selecteer Model...' }, ...(uniqueBaseConfigs?.map(c => ({ value: c.id, label: c.name })) || [])]}
                                    placeholder="Selecteer Model..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Boei Soort</label>
                                <CustomBuoySelect
                                    value={boeiSoort}
                                    onChange={(val) => {
                                        setBoeiSoort(val);
                                        const opt = SOORT_OPTIONS.find(o => o.value === val);
                                        if (opt) setSelectedColor(opt.color);
                                    }}
                                    options={SOORT_OPTIONS}
                                    placeholder="Selecteer soort..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none"
                            >
                                <option value="OK">Zichtbaar / OK</option>
                                <option value="Hidden">Verborgen</option>
                                <option value="Maintenance">Onderhoud nodig</option>
                                <option value="Lost">Vermist</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Getij Beperking</label>
                                <select
                                    value={tideRestriction}
                                    onChange={(e) => setTideRestriction(e.target.value as any)}
                                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none"
                                >
                                    <option value="Altijd">Altijd</option>
                                    <option value="Laag water">Laag water</option>
                                    <option value="Hoog water">Hoog water</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Licht Karakter</label>
                                <LightCharacterInput
                                    value={lightCharacter}
                                    onChange={(val) => setLightCharacter(val)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Notitie</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none h-24 resize-none"
                            />
                        </div>

                        {/* Photo Section */}
                        <div className="bg-app-bg/50 rounded-xl p-4 border border-app-border space-y-3 mb-4">
                            <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Foto van de locatie / boei</label>

                            {photoUrl ? (
                                <div className="relative group aspect-video rounded-lg overflow-hidden border border-app-border bg-black">
                                    <img src={photoUrl} alt="Buoy Location" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 bg-white rounded-full text-black hover:scale-110 transition-transform"
                                        >
                                            <Camera className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPhotoUrl('')}
                                            className="p-2 bg-red-600 rounded-full text-white hover:scale-110 transition-transform"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full aspect-video rounded-lg border-2 border-dashed border-app-border flex flex-col items-center justify-center gap-2 text-app-text-secondary hover:border-blue-500 hover:text-blue-500 transition-all bg-app-bg"
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <>
                                            <Camera className="w-8 h-8 opacity-20" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Maak foto of upload</span>
                                        </>
                                    )}
                                </button>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoUpload}
                            />
                        </div>

                        {/* Externe Klant */}
                        <div className="border-t border-app-border pt-4">
                            <label className={clsx(
                                "flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors",
                                isExternalCustomer
                                    ? "bg-blue-500/5 border-blue-500/20"
                                    : "bg-app-bg border-app-border hover:bg-app-surface-hover"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={isExternalCustomer}
                                    onChange={(e) => setIsExternalCustomer(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                />
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <div className="text-sm font-bold text-app-text-primary">Externe Klant</div>
                                        <div className="text-[10px] text-app-text-secondary">Boei uitgelegd voor externe partij</div>
                                    </div>
                                </div>
                            </label>

                            {isExternalCustomer && (
                                <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                    <div>
                                        <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Klantnaam / Bedrijf</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Naam klant of bedrijf..."
                                            list="existing-customers"
                                            className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                        <datalist id="existing-customers">
                                            {existingCustomers.map(cust => (
                                                <option key={cust} value={cust} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Datum Uitgelegd</label>
                                            <input
                                                type="date"
                                                value={customerDeployDate}
                                                onChange={(e) => setCustomerDeployDate(e.target.value)}
                                                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-wider mb-1.5">Datum Opgehaald</label>
                                            <input
                                                type="date"
                                                value={customerPickupDate}
                                                onChange={(e) => setCustomerPickupDate(e.target.value)}
                                                className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowReportPopup(true)}
                                        className="flex items-center gap-2 w-full justify-center py-2 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-500 hover:bg-blue-500/10 text-xs font-bold transition-colors"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        Rapport Openen / Afdrukken
                                    </button>
                                    <button
                                        onClick={() => setShowCustomerReportPopup(true)}
                                        disabled={!customerName}
                                        className="flex items-center gap-2 w-full justify-center py-2 rounded-lg border border-purple-500/20 bg-purple-500/5 text-purple-600 hover:bg-purple-500/10 text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        Klant Historiek Rapport
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer inside left column */}
                    <div className="p-6 bg-app-surface border-t border-app-border flex items-center justify-between gap-3 shrink-0">
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting || isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-500/10 rounded-lg transition-all text-sm font-bold disabled:opacity-50"
                        >
                            <Undo2 className="w-4 h-4" />
                            Binnenhalen
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-app-text-secondary hover:text-app-text-primary font-bold text-sm"
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isDeleting}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg active:scale-95 disabled:opacity-50 font-bold text-sm"
                            >
                                {isSaving ? "Opslaan..." : <><Save className="w-4 h-4" /> Opslaan</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Components / Lamp Linking */}
                <div className="hidden lg:flex flex-col h-full lg:w-1/2 bg-app-bg/30">
                    <div className="p-6 border-b border-app-border flex items-center justify-between bg-app-surface/50">
                        <h2 className="text-lg font-bold text-app-text-primary flex items-center gap-2">
                            <Component className="w-5 h-5 text-blue-500" />
                            Onderdelen
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-app-surface-hover rounded-full transition-colors">
                            <X className="w-5 h-5 text-app-text-secondary" />
                        </button>
                    </div>

                    <div className="flex p-2 gap-2 bg-app-surface/50 border-b border-app-border">
                        <button
                            onClick={() => setActiveTab('lamp')}
                            className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 relative", activeTab === 'lamp' ? 'bg-blue-100 text-blue-700' : 'text-app-text-secondary hover:bg-app-bg')}
                        >
                            <Lightbulb className="w-4 h-4" /> Lamp
                            {hasComponent(currentLamp) && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('chain')}
                            className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 relative", activeTab === 'chain' ? 'bg-blue-100 text-blue-700' : 'text-app-text-secondary hover:bg-app-bg')}
                        >
                            <Link className="w-4 h-4" /> Ketting
                            {hasComponent(currentChain) && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('stone')}
                            className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 relative", activeTab === 'stone' ? 'bg-blue-100 text-blue-700' : 'text-app-text-secondary hover:bg-app-bg')}
                        >
                            <Anchor className="w-4 h-4" /> Steen
                            {hasComponent(currentStone) && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500"></div>}
                        </button>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                        {activeTab === 'lamp' && (hasComponent(getCurrentComponent()) ? renderLinkedState(getCurrentComponent(), 'lamp') : renderEmptyState('lamp'))}
                        {activeTab === 'chain' && (hasComponent(getCurrentComponent()) ? renderLinkedState(getCurrentComponent(), 'chain') : renderEmptyState('chain'))}
                        {activeTab === 'stone' && (hasComponent(getCurrentComponent()) ? renderLinkedState(getCurrentComponent(), 'stone') : renderEmptyState('stone'))}

                        <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                            <h4 className="text-xs font-bold text-yellow-700 mb-2">Opmerking</h4>
                            <p className="text-[10px] text-yellow-800/80 leading-relaxed">
                                Wanneer je een onderdeel koppelt, wordt de status in de inventaris automatisch bijgewerkt naar "Uitgelegd".
                                <br /><br />
                                Bij het ontkoppelen kun je kiezen wat er met het onderdeel moet gebeuren (voorraad, reparatie, etc).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Unlink Dialog Overlay */}
            {showUnlinkDialog && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2100]">
                    <div className="bg-app-surface w-full max-w-sm rounded-xl border border-app-border shadow-xl p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-app-text-primary mb-2">Onderdeel Ontkoppelen</h3>
                        <p className="text-sm text-app-text-secondary mb-4">
                            Selecteer de nieuwe status voor dit onderdeel.
                        </p>

                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-app-border cursor-pointer hover:bg-app-bg transition-colors">
                                <input type="radio" name="status" value="in_stock" checked={unlinkTargetStatus === 'in_stock'} onChange={(e) => setUnlinkTargetStatus(e.target.value)} className="w-4 h-4 text-blue-600" />
                                <div>
                                    <div className="font-bold text-sm text-app-text-primary">Terug naar Voorraad</div>
                                    <div className="text-xs text-app-text-secondary">Onderdeel is OK en klaar voor gebruik</div>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-app-border cursor-pointer hover:bg-app-bg transition-colors">
                                <input type="radio" name="status" value="maintenance" checked={unlinkTargetStatus === 'maintenance'} onChange={(e) => setUnlinkTargetStatus(e.target.value)} className="w-4 h-4 text-blue-600" />
                                <div>
                                    <div className="font-bold text-sm text-app-text-primary">Onderhoud Nodig</div>
                                    <div className="text-xs text-app-text-secondary">Onderdeel moet gerepareerd worden</div>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-app-border cursor-pointer hover:bg-app-bg transition-colors">
                                <input type="radio" name="status" value="broken" checked={unlinkTargetStatus === 'broken'} onChange={(e) => setUnlinkTargetStatus(e.target.value)} className="w-4 h-4 text-blue-600" />
                                <div>
                                    <div className="font-bold text-sm text-app-text-primary">Kapot / Afgeschreven</div>
                                    <div className="text-xs text-app-text-secondary">Onderdeel is niet meer bruikbaar</div>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setShowUnlinkDialog(false)} className="flex-1 py-2 text-app-text-secondary font-bold text-sm hover:bg-app-bg rounded-lg">Annuleren</button>
                            <button onClick={handleUnlinkConfirm} className="flex-1 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 shadow-lg">Bevestigen</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Popup (Iframe) */}
            {showReportPopup && (
                <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex flex-col p-4 md:p-8 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl mx-auto rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden relative">
                        {/* Popup Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Buoy Deployment Report</h3>
                                    <p className="text-xs text-gray-500">{buoy.name} — {new Date().toLocaleDateString('nl-BE')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md active:scale-95 font-bold text-xs"
                                >
                                    <Printer className="w-4 h-4" />
                                    Afdrukken / PDF
                                </button>
                                <button
                                    onClick={() => setShowReportPopup(false)}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Iframe Content */}
                        <div className="flex-1 bg-gray-100 relative group">
                            <iframe
                                ref={iframeRef}
                                src={`/rapport/${buoy.id}?embedded=true`}
                                className="w-full h-full border-none bg-white"
                                title="Buoy Report"
                            />

                            {/* Tips Overlay */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <FileText className="w-4 h-4" />
                                Gebruik CTRL+P (of CMD+P) binnen het venster om af te drukken
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Report Popup (Iframe) */}
            {showCustomerReportPopup && (
                <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex flex-col p-4 md:p-8 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl mx-auto rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden relative">
                        {/* Popup Header */}
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                                    <Layers className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Klant Historiek Rapport</h3>
                                    <p className="text-xs text-gray-500">{customerName} — {new Date().toLocaleDateString('nl-BE')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCustomerPrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-md active:scale-95 font-bold text-xs"
                                >
                                    <Printer className="w-4 h-4" />
                                    Afdrukken / PDF
                                </button>
                                <button
                                    onClick={() => setShowCustomerReportPopup(false)}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Iframe Content */}
                        <div className="flex-1 bg-gray-100 relative group">
                            <iframe
                                ref={customerIframeRef}
                                src={`/rapport/klant/${encodeURIComponent(customerName)}?embedded=true`}
                                className="w-full h-full border-none bg-white"
                                title="Customer Report"
                            />

                            {/* Tips Overlay */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-purple-600/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <FileText className="w-4 h-4" />
                                Gebruik CTRL+P (of CMD+P) binnen het venster om af te drukken
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
