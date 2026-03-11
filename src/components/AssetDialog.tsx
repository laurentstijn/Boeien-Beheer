'use client';

import { useState, useEffect, useMemo, useRef, useActionState, Fragment } from 'react';
// import { useFormState } from 'react-dom'; // DEPRECATED in React 19
import { createAsset, updateAsset } from '@/app/actions';
import { X, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { BuoyIcon } from './BuoyIcon';
import { SearchableSelect } from './SearchableSelect';

interface AssetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    asset?: any; // The asset to edit
    itemTypes?: any[]; // List of available item types for "create" mode
    buoys?: any[]; // List of available buoys
    category?: string; // Explicit category for "create" mode
}

const initialState = {
    message: '',
    success: false,
};

// Helper to get color classes/styles
function getColorPreview(color: string) {
    const c = color.toLowerCase();

    if (c.includes('rood')) return { className: 'bg-red-600 border border-red-700' };
    if (c.includes('groen')) return { className: 'bg-green-600 border border-green-700' };
    if (c.includes('geel') && !c.includes('blauw') && !c.includes('zwart')) return { className: 'bg-yellow-400 border border-yellow-500' };
    if (c.includes('zwart')) return { className: 'bg-black border border-gray-800' };
    if (c.includes('wit')) return { className: 'bg-white border border-gray-300' };
    if (c.includes('blauw') && c.includes('geel')) return { className: 'bg-[linear-gradient(to_bottom,#3b82f6_50%,#facc15_50%)] border border-blue-600' }; // Blue/Yellow vertical? Usually stripes. Let's do simple split.
    if (c.includes('blauw')) return { className: 'bg-blue-600 border border-blue-700' };

    // Cardinals
    if (c.includes('noord')) return { className: 'bg-[linear-gradient(to_bottom,black_50%,#facc15_50%)] border border-black' }; // Black over Yellow
    if (c.includes('zuid')) return { className: 'bg-[linear-gradient(to_bottom,#facc15_50%,black_50%)] border border-black' }; // Yellow over Black
    if (c.includes('oost')) return { className: 'bg-[linear-gradient(to_bottom,black_33%,#facc15_33%,#facc15_66%,black_66%)] border border-black' }; // Black-Yellow-Black
    if (c.includes('west')) return { className: 'bg-[linear-gradient(to_bottom,#facc15_33%,black_33%,black_66%,#facc15_66%)] border border-black' }; // Yellow-Black-Yellow

    return { className: 'bg-gray-200 border border-gray-300' }; // Default
}


// Internal Form Component that holds the state
// This component will be unmounted when the dialog closes, resetting the state
function AssetForm({ mode, asset, itemTypes, buoys = [], formCategory, onSuccess, onClose }: {
    mode: 'create' | 'edit';
    asset?: any;
    itemTypes: any[];
    buoys?: any[];
    formCategory: string;
    onSuccess: () => void;
    onClose: () => void;
}) {
    const [state, formAction, isPending] = useActionState(mode === 'create' ? createAsset : updateAsset, initialState);

    // Use the passed formCategory

    // Derive unique weights and shapes from existing itemTypes for the datalist
    const uniqueWeights = useMemo(() => {
        const weights = itemTypes
            .filter(i => i.category === 'Steen' && i.specs?.weight)
            .map(i => i.specs.weight);
        return Array.from(new Set(weights)).sort();
    }, [itemTypes]);

    const uniqueShapes = useMemo(() => {
        const shapes = itemTypes
            .filter(i => i.category === 'Steen' && i.specs?.shape)
            .map(i => i.specs.shape);
        return Array.from(new Set(shapes)).sort();
    }, [itemTypes]);

    // Form specific state
    const [isCustomType, setIsCustomType] = useState(false);
    const [availableChains, setAvailableChains] = useState<any[]>([]);
    const [hasChain, setHasChain] = useState(false);
    const [status, setStatus] = useState(asset?.status || 'in_stock');

    // Grouping State
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedRawColor, setSelectedRawColor] = useState('');
    const [selectedAutoName, setSelectedAutoName] = useState('');

    const ALL_COLORS = useMemo(() => [
        { rawColor: 'Groen', label: 'Spits (Groen)' },
        { rawColor: 'Rood', label: 'Plat (Rood)' },
        { rawColor: 'Noord', label: 'Noord Cardinaal' },
        { rawColor: 'Zuid', label: 'Zuid Cardinaal' },
        { rawColor: 'Oost', label: 'Oost Cardinaal' },
        { rawColor: 'West', label: 'West Cardinaal' },
        { rawColor: 'Blauw/Geel', label: 'Wrak (Blauw/Geel)' },
        { rawColor: 'Geel', label: 'Bijzonder (Geel)' },
        { rawColor: 'Zwart', label: 'Markering (Zwart)' },
        { rawColor: 'Blauw', label: 'Markering (Blauw)' },
    ], []);

    // Custom Dropdown State
    const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buoyDropdownRef = useRef<HTMLDivElement>(null);

    const [selectedBuoyId, setSelectedBuoyId] = useState(asset?.deployment_id || '');
    const selectedBuoy = useMemo(() => buoys.find(b => b.id === selectedBuoyId), [buoys, selectedBuoyId]);

    const groupedItems = useMemo(() => {
        const groups: Record<string, Record<string, { id: string; color: string; rawColor: string }[]>> = {};
        const colorRegex = /(Blauw\/Geel|Geel\/Zwart|Zwart\/Geel|Noord|Zuid|Oost|West|Groen|Zwart|Rood|Geel|Blauw|Wit)/i;
        const reserveRegex = /(Drijflichaam|Reserve)/i;

        const KIND_MAPPING: Record<string, string> = {
            'Groen': 'Spits',
            'Rood': 'Plat',
            'Noord': 'Noord Cardinaal',
            'Zuid': 'Zuid Cardinaal',
            'Oost': 'Oost Cardinaal',
            'West': 'West Cardinaal',
            'Blauw/Geel': 'Wrak',
            'Geel/Zwart': 'Wrak',
            'Zwart/Geel': 'Wrak',
            'Geel': 'Bijzonder',
            'Wit': 'Markering',
            'Zwart': 'Markering',
        };

        itemTypes.forEach(item => {
            const cat = (item.category || '').toLowerCase();
            const isBuoyOrStruct = cat === 'boei' || cat === 'structuur' || formCategory === 'Boei';

            if (!isBuoyOrStruct) return;

            const colorMatch = item.name.match(colorRegex);
            const reserveMatch = item.name.match(reserveRegex);
            const isStructure = cat === 'structuur';

            let type = 'Volledige Boei';
            if (reserveMatch) type = 'Reserve Drijflichaam';
            else if (isStructure) type = 'Structuur';

            let colorMatchStr = colorMatch ? colorMatch[0] : 'Standaard';

            // Normalize case for mapping: Title Case, also after /
            const normalizedColor = colorMatchStr
                .toLowerCase()
                .split('/')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join('/');

            let displayLabel = normalizedColor;
            if (KIND_MAPPING[normalizedColor]) {
                displayLabel = `${KIND_MAPPING[normalizedColor]} (${normalizedColor})`;
            }

            if (type === 'Structuur' && colorMatchStr === 'Standaard') {
                colorMatchStr = 'Geen Kleur';
                displayLabel = 'Standaard Structuur';
            }

            // Extract the base model name precisely
            let model = item.name;

            // Explicitly handle known models to avoid them being split incorrectly
            const knownModels = [
                'MOBILIS AQ1500',
                'MOBILIS BC1241/BC1242',
                'JET 9000',
                'JET 2000',
                'JFC MARINE 1250',
                'JFC MARINE 1500',
                'SEALITE SLB 1500'
            ];
            const foundKnown = knownModels.find(m => model.toUpperCase().includes(m));

            if (foundKnown) {
                model = foundKnown;
            } else {
                if (colorMatch) model = model.replace(colorMatch[0], '');
                if (reserveMatch) model = model.replace(reserveMatch[0], '');
                if (isStructure) model = model.replace(/Structuur/i, '');

                model = model
                    .replace(/\(\)/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            if (!model) model = item.name;

            if (!groups[model]) groups[model] = {};
            if (!groups[model][type]) groups[model][type] = [];
            groups[model][type].push({ id: item.id, color: displayLabel, rawColor: normalizedColor });
        });
        return groups;
    }, [itemTypes]);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsColorDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync state with asset
    useEffect(() => {
        setHasChain(asset?.metadata?.hasChain === true || asset?.metadata?.chain === 'Ja');
        if (asset?.status) setStatus(asset.status);
        if (asset?.deployment_id) setSelectedBuoyId(asset.deployment_id);

        if (mode === 'create') {
            setSelectedModel('');
            setSelectedType('');
            setSelectedItemId('');
            setSelectedColor('');
            setSelectedRawColor('');
            setSelectedAutoName('');
            setSelectedBuoyId('');
            setIsCustomType(false);
        } else if (asset) {
            const currentItemId = asset.item_id || asset.item?.id;
            setSelectedItemId(currentItemId);

            // Try to set model/type/color for Edit mode
            const item = itemTypes.find(t => t.id === currentItemId);
            if (item) {
                for (const [model, types] of Object.entries(groupedItems)) {
                    for (const [type, variants] of Object.entries(types)) {
                        const variant = variants.find(v => v.id === item.id);
                        if (variant) {
                            setSelectedModel(model);
                            setSelectedType(type);
                            setSelectedColor(variant.color);
                            setSelectedRawColor(variant.rawColor);
                            setSelectedItemId(variant.id); // Ensure ID is also set
                            return;
                        }
                    }
                }
            }
        }
    }, [asset, mode, itemTypes, groupedItems]);

    // Auto-select color/variant if only one exists
    useEffect(() => {
        if (mode === 'create' && selectedModel && selectedType && !isCustomType) {
            const variants = groupedItems[selectedModel]?.[selectedType];
            if (variants && variants.length === 1 && !selectedItemId) {
                // Determine if we should augment (if true, we have more than 1 option in reality)
                const shouldAugment = selectedType === 'Volledige Boei' || selectedType === 'Reserve Drijflichaam';
                if (!shouldAugment) {
                    setSelectedItemId(variants[0].id);
                    setSelectedColor(variants[0].color);
                    setSelectedRawColor(variants[0].rawColor);
                }
            }
        }
    }, [selectedModel, selectedType, groupedItems, mode, isCustomType, selectedItemId]);

    // Fetch chains
    useEffect(() => {
        if (formCategory === 'Steen') {
            fetch('/api/chains')
                .then(res => res.json())
                .then(data => setAvailableChains(data.chains || []))
                .catch(err => console.error('Failed to fetch chains:', err));
        }
    }, [formCategory]);

    // Close on success
    useEffect(() => {
        if (state.success) {
            onSuccess();
        }
    }, [state.success, onSuccess]);

    return (
        <form action={formAction} className="space-y-4">
            {/* Hidden fields to ensure server action gets essential data */}
            <input type="hidden" name="category" value={formCategory} />
            {isCustomType && <input type="hidden" name="itemId" value="custom" />}

            {mode === 'edit' && <input type="hidden" name="id" value={asset?.id} />}
            {asset?.category && <input type="hidden" name="category" value={asset.category} />}

            <div>
                <div className="space-y-4">
                    {formCategory === 'Boei' ? (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Kies Model</label>
                                <select
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                                    value={selectedModel}
                                    onChange={(e) => {
                                        setSelectedModel(e.target.value);
                                        setSelectedType('');
                                        setSelectedColor('');
                                        setSelectedRawColor('');
                                        setSelectedAutoName('');
                                        setSelectedItemId('');
                                        setIsCustomType(e.target.value === 'custom');
                                    }}
                                >
                                    <option value="">Selecteer model...</option>
                                    {Object.keys(groupedItems)
                                        .sort((a, b) => a.localeCompare(b))
                                        .map((model) => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    <option value="custom" className="text-blue-500 font-bold">+ Nieuw artikel type...</option>
                                </select>
                            </div>

                            {!isCustomType && selectedModel && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Kies Categorie</label>
                                    <select
                                        className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                                        value={selectedType}
                                        onChange={(e) => {
                                            setSelectedType(e.target.value);
                                            setSelectedColor('');
                                            setSelectedRawColor('');
                                            setSelectedAutoName('');
                                            setSelectedItemId('');
                                        }}
                                    >
                                        <option value="">Selecteer...</option>
                                        {Object.keys(groupedItems[selectedModel] || {})
                                            .sort((a, b) => {
                                                // Ensure a logical order: Boei -> Reserve -> Structuur
                                                const order: Record<string, number> = { 'Volledige Boei': 1, 'Reserve Drijflichaam': 2, 'Structuur': 3 };
                                                return (order[a] || 99) - (order[b] || 99);
                                            })
                                            .map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {!isCustomType && selectedModel && selectedType && (
                                (() => {
                                    let variants = (groupedItems[selectedModel]?.[selectedType] || []) as any[];

                                    // Augment with missing standard colors for Boei and Reserve
                                    if (selectedType === 'Volledige Boei' || selectedType === 'Reserve Drijflichaam') {
                                        const existingRawColors = new Set(variants.map(v => v.rawColor));
                                        const augmentedVariants = [...variants];

                                        const allowedReserveColors = ['Groen', 'Rood', 'Geel', 'Zwart', 'Blauw'];
                                        const colorsToAdd = selectedType === 'Reserve Drijflichaam'
                                            ? ALL_COLORS.filter(c => allowedReserveColors.includes(c.rawColor))
                                            : ALL_COLORS;

                                        colorsToAdd.forEach(c => {
                                            if (!existingRawColors.has(c.rawColor)) {
                                                augmentedVariants.push({
                                                    id: 'custom',
                                                    color: c.label,
                                                    rawColor: c.rawColor,
                                                    autoName: `${selectedModel}${selectedType === 'Reserve Drijflichaam' ? ' Reserve Drijflichaam' : ''} ${c.rawColor}`
                                                });
                                            }
                                        });
                                        variants = augmentedVariants;
                                    }

                                    const isSingleVariant = variants.length === 1;

                                    if (isSingleVariant && selectedItemId) {
                                        return <input type="hidden" name="itemId" value={selectedItemId} required />;
                                    }

                                    return (
                                        <div className="animate-in slide-in-from-top-2 duration-200" ref={dropdownRef}>
                                            <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Kleur / Variant</label>
                                            <input type="hidden" name="itemId" value={selectedItemId || 'custom'} required />
                                            {(selectedItemId === 'custom' || !selectedItemId) && selectedAutoName && (
                                                <input type="hidden" name="customItemName" value={selectedAutoName} />
                                            )}
                                            <div className="flex items-center gap-3">
                                                {selectedColor ? (
                                                    <div className="w-[48px] h-[48px] flex items-center justify-center flex-shrink-0 bg-app-bg border border-app-border rounded-xl">
                                                        <BuoyIcon color={selectedRawColor} size="md" />
                                                    </div>
                                                ) : null}
                                                <select
                                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                                                    value={selectedItemId === 'custom' ? `custom-${selectedRawColor}` : selectedItemId}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const isCustom = val.startsWith('custom-');
                                                        const searchId = isCustom ? 'custom' : val;
                                                        
                                                        const item = variants.find(x => x.id === searchId && (!isCustom || `custom-${x.rawColor}` === val));
                                                        
                                                        if (item) {
                                                            setSelectedItemId(item.id);
                                                            setSelectedColor(item.color);
                                                            setSelectedRawColor(item.rawColor);
                                                            if (item.autoName) setSelectedAutoName(item.autoName);
                                                        }
                                                    }}
                                                >
                                                    <option value="" disabled>Selecteer kleur...</option>
                                                    {variants.map((item) => {
                                                        const uniqueVal = item.id === 'custom' ? `custom-${item.rawColor}` : item.id;
                                                        return (
                                                            <option key={uniqueVal} value={uniqueVal}>
                                                                {item.color}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })()
                            )}

                            {isCustomType && (
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        name="customItemName"
                                        placeholder="Bijv. JET 3000"
                                        required
                                        className="w-full bg-app-bg border border-blue-500/50 rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                    {formCategory === 'Boei' && (
                                        <div className="mt-3">
                                            <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Kleur (Optioneel)</label>
                                            <select
                                                name="customItemColor"
                                                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                                            >
                                                <option value="">Selecteer kleur...</option>
                                                {ALL_COLORS.map(c => <option key={c.rawColor} value={c.rawColor}>{c.label}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div className="mt-3 bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl">
                                        <label className="block text-xs font-semibold text-blue-600 mb-1 ml-1">Minimum Voorraad (Optioneel)</label>
                                        <input
                                            type="number"
                                            name="min_stock_level"
                                            placeholder="0"
                                            min="0"
                                            className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:border-blue-500 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                            )}
                        </>
                    ) : (
                        // Non-Boei categories: Simple dropdown or custom name
                        <div>
                            <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">
                                {formCategory === 'Ketting' ? 'Ketting Type' :
                                    formCategory === 'Steen' ? 'Steen Type' :
                                        formCategory === 'Topteken' ? 'Topteken Type' : 'Type'}
                            </label>
                            <select
                                name="itemId"
                                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                                value={selectedItemId || (isCustomType ? 'custom' : '')}
                                onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                        setIsCustomType(true);
                                        setSelectedItemId('');
                                    } else {
                                        setIsCustomType(false);
                                        setSelectedItemId(e.target.value);
                                    }
                                }}
                            >
                                <option value="">Selecteer bestaand type...</option>
                                {itemTypes.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                                <option value="custom" className="text-blue-500 font-bold">+ Nieuw type...</option>
                            </select>

                            {!isCustomType && selectedItemId && (
                                <input type="hidden" name="itemId" value={selectedItemId} required />
                            )}

                            {isCustomType && (
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        name="customItemName"
                                        placeholder={
                                            formCategory === 'Ketting' ? 'Bijv. Ketting Oranje 20m' :
                                                formCategory === 'Steen' ? 'Bijv. 5T Vierkant' :
                                                    formCategory === 'Topteken' ? 'Bijv. Spits (Oranje)' : 'Naam...'
                                        }
                                        required
                                        className="w-full bg-app-bg border border-blue-500/50 rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                    <div className="mt-3 bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl">
                                        <label className="block text-xs font-semibold text-blue-600 mb-1 ml-1">Minimum Voorraad (Optioneel)</label>
                                        <input
                                            type="number"
                                            name="min_stock_level"
                                            placeholder="0"
                                            min="0"
                                            className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:border-blue-500 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Dropdown */}
            <div>
                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Status</label>
                <select
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                    <option value="in_stock">In Opslag (Beschikbaar)</option>
                    <option value="deployed">Uitgelegd (Deployed)</option>
                    <option value="maintenance">In Onderhoud</option>
                    <option value="broken">Defect / Afgekeurd</option>
                    <option value="lost">Verloren</option>
                </select>
            </div>

            {/* Deployed Buoy Selection */}
            {
                status === 'deployed' && (
                    <div className="animate-in slide-in-from-top-2 duration-200" ref={buoyDropdownRef}>
                        <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Koppel aan Boei</label>
                        <input type="hidden" name="deployment_buoy_id" value={selectedBuoyId} />

                        <SearchableSelect
                            value={selectedBuoyId || ''}
                            onChange={setSelectedBuoyId}
                            options={[
                                { value: '', label: 'Selecteer een boei...' },
                                ...buoys.map(buoy => ({
                                    value: buoy.id,
                                    label: buoy.name,
                                    icon: <div className={clsx("w-3.5 h-3.5 rounded-full shadow-sm", getColorPreview(buoy.buoyType?.color || 'yellow').className)} />
                                }))
                            ]}
                            placeholder="Selecteer een boei..."
                        />
                        <p className="text-xs text-app-text-secondary mt-1 ml-1">
                            Selecteer de boei waar dit onderdeel momenteel op is uitgelegd.
                        </p>
                    </div>
                )
            }

            {/* Location Dropdown - Hide when deployed */}
            {
                status !== 'deployed' && (
                    <div>
                        <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Locatie</label>
                        <select
                            name="location"
                            defaultValue={asset?.location || 'Magazijn'}
                            className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                        >
                            <option value="Magazijn">Magazijn</option>
                            <option value="Kallo">Kallo</option>
                            <option value="Aan boord">Aan boord</option>
                        </select>
                    </div>
                )
            }

            {
                formCategory === 'Lamp' && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 border-t border-app-border pt-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Kleur</label>
                                <select
                                    name="lamp_color"
                                    defaultValue={asset?.metadata?.color || asset?.metadata?.lamp_color || 'Geel'}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all cursor-pointer text-sm"
                                >
                                    <option value="Geel">Geel</option>
                                    <option value="Rood">Rood</option>
                                    <option value="Groen">Groen</option>
                                    <option value="Wit">Wit</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Serienummer</label>
                                <input
                                    type="text"
                                    name="article_number"
                                    defaultValue={asset?.metadata?.serialNumber || asset?.metadata?.serial_number || asset?.metadata?.article_number || ''}
                                    placeholder="Bijv. 1560144833"
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary font-mono focus:outline-none focus:border-blue-500 transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Merk / Fabrikant</label>
                                <input
                                    type="text"
                                    name="brand"
                                    defaultValue={asset?.metadata?.brand || asset?.metadata?.manufacturer || ''}
                                    placeholder="Bijv. Sabik"
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center space-x-2 bg-app-bg/50 p-3 rounded-xl border border-app-border">
                                <input
                                    type="checkbox"
                                    id="ble"
                                    name="ble"
                                    defaultChecked={asset?.metadata?.ble}
                                    className="w-4 h-4 rounded border-app-border text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="ble" className="text-sm font-medium text-app-text-primary cursor-pointer">
                                    Heeft Bluetooth (BLE)?
                                </label>
                            </div>
                            <div className="flex items-center space-x-2 bg-app-bg/50 p-3 rounded-xl border border-app-border">
                                <input
                                    type="checkbox"
                                    id="gps"
                                    name="gps"
                                    defaultChecked={asset?.metadata?.gps}
                                    className="w-4 h-4 rounded border-app-border text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="gps" className="text-sm font-medium text-app-text-primary cursor-pointer">
                                    Heeft GPS?
                                </label>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                (formCategory === 'Ketting') && (
                    <div className="space-y-3 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Lengte</label>
                                <input
                                    type="text"
                                    name="length"
                                    defaultValue={asset?.metadata?.length || asset?.item?.specs?.length || ''}
                                    placeholder="Bijv. 15m"
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Dikte/Diameter</label>
                                <input
                                    type="text"
                                    name="thickness"
                                    defaultValue={asset?.metadata?.thickness || asset?.item?.specs?.thickness || ''}
                                    placeholder="Bijv. 25mm"
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-app-bg px-4 py-2.5 rounded-xl border border-app-border">
                            <input
                                type="checkbox"
                                id="swivel"
                                name="swivel"
                                defaultChecked={asset?.metadata?.swivel === 'Ja'}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-app-surface cursor-pointer"
                            />
                            <label htmlFor="swivel" className="text-sm font-medium text-app-text-primary cursor-pointer">
                                Heeft draainagel?
                            </label>
                        </div>
                    </div>
                )
            }

            {
                (formCategory === 'Steen') && (
                    <div className="space-y-3 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Gewicht</label>
                                <input
                                    type="text"
                                    name="weight"
                                    list="weight-options"
                                    defaultValue={asset?.metadata?.weight || asset?.item?.specs?.weight || itemTypes.find(t => t.id === selectedItemId)?.specs?.weight || ''}
                                    placeholder="Bijv. 1000kg"
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all text-sm"
                                />
                                <datalist id="weight-options">
                                    {uniqueWeights.map((w) => (
                                        <option key={w} value={w} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Vorm</label>
                                <input
                                    type="text"
                                    name="shape"
                                    list="shape-options"
                                    defaultValue={asset?.metadata?.shape || asset?.item?.specs?.shape || itemTypes.find(t => t.id === selectedItemId)?.specs?.shape || ''}
                                    placeholder="Bijv. Vierkant"
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all text-sm"
                                />
                                <datalist id="shape-options">
                                    {uniqueShapes.map((s) => (
                                        <option key={s} value={s} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-app-bg px-4 py-2.5 rounded-xl border border-app-border">
                            <input
                                type="checkbox"
                                id="hasChain"
                                name="hasChain"
                                checked={hasChain}
                                onChange={(e) => setHasChain(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-app-surface cursor-pointer"
                            />
                            <label htmlFor="hasChain" className="text-sm font-medium text-app-text-primary cursor-pointer">
                                Heeft ketting gekoppeld?
                            </label>
                        </div>

                        {hasChain && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Kies Ketting</label>
                                <select
                                    name="chain_id"
                                    defaultValue={asset?.metadata?.chain_id || ''}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all text-sm"
                                >
                                    <option value="">Selecteer een ketting...</option>
                                    {availableChains.map((c: any) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.metadata?.length && `(${c.metadata.length})`} {c.metadata?.article_number && `[${c.metadata.article_number}]`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )
            }

            {
                formCategory !== 'Lamp' && (
                    <div>
                        <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Artikel Nummer</label>
                        <input
                            type="text"
                            name="article_number"
                            defaultValue={asset?.metadata?.article_number || ''}
                            placeholder="Bijv. ART-12345"
                            className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary font-mono focus:outline-none focus:border-blue-500 transition-all"
                        />
                    </div>
                )
            }

            <div>
                <label className="block text-sm font-semibold text-app-text-secondary mb-1.5 ml-1">Notities</label>
                <textarea
                    name="notes"
                    defaultValue={asset?.metadata?.notes || ''}
                    rows={3}
                    placeholder="Extra informatie over dit asset..."
                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
            </div>

            {
                state.message && (
                    <div className={clsx(
                        "mt-4 p-3 rounded-xl text-center text-sm font-medium animate-in zoom-in-95 duration-200",
                        state.success ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                    )}>
                        {state.message}
                    </div>
                )
            }

            <div className="flex gap-3 pt-4 border-t border-app-border mt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-app-border text-app-text-primary font-medium hover:bg-app-surface-hover transition-all"
                >
                    Annuleren
                </button>
                <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95"
                >
                    {mode === 'create' ? 'Aanmaken' : 'Opslaan'}
                </button>
            </div>
        </form >
    );
}

export function AssetDialog({ isOpen, onClose, mode, asset, itemTypes = [], buoys = [], category: explicitCategory }: AssetDialogProps) {
    const category = explicitCategory || asset?.category || asset?.item?.category || 'Asset';

    const getTitle = () => {
        if (mode === 'create') {
            return `Nieuwe ${category === 'Asset' ? 'Asset' : category} Toevoegen`;
        }
        return `${category === 'Asset' ? 'Asset' : category} Bewerken`;
    };

    return (
        <Fragment>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-app-surface border border-app-border rounded-xl md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-4 md:p-6 border-b border-app-border bg-app-bg/50">
                            <h3 className="text-lg md:text-xl font-bold text-app-text-primary">
                                {getTitle()}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-app-surface-hover rounded-full transition-colors text-app-text-secondary hover:text-app-text-primary"
                            >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="p-4 md:p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <AssetForm
                                mode={mode}
                                asset={asset}
                                itemTypes={itemTypes}
                                buoys={buoys}
                                formCategory={category}
                                onSuccess={onClose}
                                onClose={onClose}
                            />
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
}
