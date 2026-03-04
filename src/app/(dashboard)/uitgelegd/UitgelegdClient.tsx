"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { BuoyMap } from "@/components/BuoyMap";
import { BuoyIcon } from "@/components/BuoyIcon";
import {
    Pencil, Undo2, Trash2, Ship, MapPin, Search, ArrowUpDown,
    ArrowUp, ArrowDown, AlertTriangle, Calendar, Bluetooth,
    Navigation, Hammer, Edit2, Check, X as XIcon, Lightbulb, Link, Building2, Wand2,
    ChevronDown, ChevronUp
} from "lucide-react";
import clsx from "clsx";
import { DeployedBuoy } from '@/lib/data';
import EditDeployedBuoyDialog from './EditDeployedBuoyDialog';
import MaintenanceDialog from '@/components/MaintenanceDialog';
import RetrieveBuoyDialog from './RetrieveBuoyDialog';
import { ChainIcon } from '@/components/ChainIcon';
import { StoneIcon } from '@/components/StoneIcon';

interface UitgelegdClientProps {
    initialBuoys: DeployedBuoy[];
    buoyConfigurations: any[];
    availableLamps: any[];
    availableChains?: any[];
    availableStones?: any[];
    activeZone?: string | null;
}

type SortField = 'name' | 'type' | 'maintenance' | 'status' | 'extern' | 'gepland';
type SortOrder = 'asc' | 'desc';

export default function UitgelegdClient({ initialBuoys, buoyConfigurations, availableLamps, availableChains = [], availableStones = [], activeZone = null }: UitgelegdClientProps) {
    const [buoys, setBuoys] = useState<DeployedBuoy[]>(initialBuoys);
    const [selectedBuoyId, setSelectedBuoyId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortField, setSortField] = useState<SortField>('maintenance');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [showHidden, setShowHidden] = useState(false);
    const [editingBuoy, setEditingBuoy] = useState<DeployedBuoy | null>(null);
    const [maintenanceBuoy, setMaintenanceBuoy] = useState<DeployedBuoy | null>(null);
    const [plannedEntries, setPlannedEntries] = useState<any[]>([]);
    const [retrievingBuoy, setRetrievingBuoy] = useState<DeployedBuoy | null>(null);

    const getBuoyDisplayColor = (b: any) => {
        if (!b) return 'Yellow';
        // Priority 1: Buoy Configuration Color
        if (b.buoyType?.color && b.buoyType.color.toLowerCase() !== 'onbekend') {
            const c = b.buoyType.color;
            if (c.toLowerCase().includes('blauw') && c.toLowerCase().includes('geel')) return 'Blauw/Geel';
            if (c.toLowerCase().includes('zwart') && c.toLowerCase().includes('geel')) return 'Zwart/Geel';
            return c.charAt(0).toUpperCase() + c.slice(1);
        }

        // Priority 2: Metadata Color
        if (b.metadata?.color && b.metadata.color !== 'Onbekend') {
            const c = b.metadata.color;
            if (c.toLowerCase().includes('blauw') && c.toLowerCase().includes('geel')) return 'Blauw/Geel';
            if (c.toLowerCase().includes('zwart') && c.toLowerCase().includes('geel')) return 'Zwart/Geel';
            return c.charAt(0).toUpperCase() + c.slice(1);
        }

        // Priority 3: Fallback parsing Name/Details
        const searchString = `${b.name} ${b.details || ''} ${b.metadata?.model || ''}`.toUpperCase();
        if (searchString.includes('BLAUW/GEEL')) return 'Blauw/Geel';
        if (searchString.includes('ZWART/GEEL')) return 'Zwart/Geel';
        if (searchString.includes('ROOD')) return 'Rood';
        if (searchString.includes('GROEN')) return 'Groen';
        if (searchString.includes('ZWART')) return 'Zwart';
        if (searchString.includes('BLAUW')) return 'Blauw';
        if (searchString.includes('NOORD')) return 'Noord';
        if (searchString.includes('ZUID')) return 'Zuid';
        if (searchString.includes('OOST')) return 'Oost';
        if (searchString.includes('WEST')) return 'West';

        return 'Yellow';
    };



    const refreshPlanning = async () => {
        try {
            const res = await fetch('/api/maintenance/planning');
            let dbPlans = await res.json();
            if (!Array.isArray(dbPlans)) dbPlans = [];

            // AUTOMATIC MAGIC PLANNING INJECTION
            const todayStrStrict = new Date().toISOString().split('T')[0];
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() + 10);
            limitDate.setHours(23, 59, 59, 999);

            const plannedBuoyIds = new Set(dbPlans.map((p: any) => p.buoy_id));

            let overdueBuoys = buoys.filter(b => {
                if (b.status === 'Hidden' || b.status === 'Lost' || b.status === 'Maintenance') return false;
                if (plannedBuoyIds.has(b.id)) return false;

                if (b.status === 'Niet OK') return true;

                if (!b.nextServiceDue) return false;
                return new Date(b.nextServiceDue) <= limitDate;
            });

            // 1. Delineate strictly OVERDUE buoys into two tiers
            const tier1 = overdueBuoys.filter(b => b.status === 'Niet OK');
            const tier2 = overdueBuoys.filter(b => b.status !== 'Niet OK');

            // 2. Sort both tiers chronologically (most urgent first)
            tier1.sort((a, b) => new Date(a.nextServiceDue || 0).getTime() - new Date(b.nextServiceDue || 0).getTime());
            tier2.sort((a, b) => new Date(a.nextServiceDue || 0).getTime() - new Date(b.nextServiceDue || 0).getTime());

            // 3. One unified list of all urgent buoys
            const sortedOverdue = [...tier1, ...tier2];

            const assignedPerDay: Record<string, number> = {};

            if (sortedOverdue.length > 0) {
                const todayDate = new Date();
                const futureDate = new Date();
                futureDate.setDate(todayDate.getDate() + 14);

                const fromParam = todayDate.toISOString().split('T')[0];
                const toParam = futureDate.toISOString().split('T')[0];

                const TIDE_STATIONS = [
                    { name: "Prosperpolder", astroHW_id: "04112717010", lat: 51.3483272650923, lng: 4.23793225487478 },
                    { name: "Kallo", astroHW_id: "04113436010", lat: 51.2679979571716, lng: 4.29852383884503 },
                    { name: "Antwerpen", astroHW_id: "04112707010", lat: 51.227468146743, lng: 4.39991370684368 },
                    { name: "Rupelmonde", astroHW_id: "04112712010", lat: 51.1359646843388, lng: 4.32230864155543 },
                    { name: "Boom", astroHW_id: "04113401010", lat: 51.0868580992141, lng: 4.35368553727916 },
                    { name: "Temse", astroHW_id: "04113491010", lat: 51.1228087597494, lng: 4.21867338754706 },
                    { name: "Driegoten", astroHW_id: "04113411010", lat: 51.0925568254825, lng: 4.17099518412599 }
                ];

                const buoysByStation: Record<string, any[]> = {};

                // Only fetch tide data for buoys that actually need it
                for (const b of sortedOverdue) {
                    if (b.tideRestriction === 'Hoog water') {
                        let nearestStation = TIDE_STATIONS[0];
                        const lat = b.location?.lat || b.metadata?.location?.lat;
                        const lng = b.location?.lng || b.metadata?.location?.lng;
                        if (lat && lng) {
                            nearestStation = TIDE_STATIONS.reduce((prev, curr) => {
                                const prevDist = Math.sqrt(Math.pow(prev.lat - lat, 2) + Math.pow(prev.lng - lng, 2));
                                const currDist = Math.sqrt(Math.pow(curr.lat - lat, 2) + Math.pow(curr.lng - lng, 2));
                                return currDist < prevDist ? curr : prev;
                            });
                        }
                        if (!buoysByStation[nearestStation.astroHW_id]) buoysByStation[nearestStation.astroHW_id] = [];
                        buoysByStation[nearestStation.astroHW_id].push(b);
                    }
                }

                const now = new Date();
                const stationTimelines: Record<string, any[]> = {};
                const fetchPromises = Object.keys(buoysByStation).map(async (stationId) => {
                    try {
                        const tideRes = await fetch(`https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeseriesValues&ts_id=${stationId}&format=json&from=${fromParam}&to=${toParam}`);
                        if (tideRes.ok) {
                            const tideData = await tideRes.json();
                            const measurements = tideData[0]?.data || [];
                            const validWindows: any[] = [];

                            for (const [timestampStr, level] of measurements) {
                                const dateObj = new Date(timestampStr);
                                if (dateObj < now) continue;

                                const hour = dateObj.getHours();
                                const min = dateObj.getMinutes();
                                const dayOfWeek = dateObj.getDay();

                                if (dayOfWeek !== 0 && dayOfWeek !== 6 && hour >= 11 && hour <= 16 && level >= 4.0) {
                                    validWindows.push({
                                        date: dateObj.toISOString().split('T')[0],
                                        time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
                                        level: level
                                    });
                                }
                            }
                            stationTimelines[stationId] = validWindows;
                        }
                    } catch (e) {
                        console.error(`Tide fetch failed for station ${stationId}`);
                    }
                });

                await Promise.all(fetchPromises);

                let cursorDate = new Date();
                if (cursorDate.getHours() >= 16) {
                    cursorDate.setDate(cursorDate.getDate() + 1);
                }

                // Process all buoys in order of absolute urgency
                for (const b of sortedOverdue) {
                    if (b.tideRestriction === 'Hoog water') {
                        const stationId = Object.keys(buoysByStation).find(id => buoysByStation[id].some((buoy: any) => buoy.id === b.id));
                        if (!stationId) continue;

                        const windows = stationTimelines[stationId] || [];
                        const stationObj = TIDE_STATIONS.find(s => s.astroHW_id === stationId);

                        for (const win of windows) {
                            if (!assignedPerDay[win.date]) assignedPerDay[win.date] = 0;

                            if (assignedPerDay[win.date] < 2) {
                                dbPlans.push({
                                    id: `magic-${b.id}`,
                                    buoy_id: b.id,
                                    planned_date: win.date,
                                    notes: `VIRTUELE PLANNING: Lokaal Hoogwater (${stationObj?.name || 'Onbekend'}) om ${win.time} (${win.level.toFixed(2)}m).`,
                                    is_virtual: true,
                                    virtual_time: win.time
                                });
                                assignedPerDay[win.date]++;
                                break;
                            }
                        }
                    } else {
                        // Regular buoy planning (no tide needed), just grab next available working day slot
                        for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
                            const checkDate = new Date(cursorDate);
                            checkDate.setDate(checkDate.getDate() + dayOffset);

                            const dOfWeek = checkDate.getDay();
                            if (dOfWeek === 0 || dOfWeek === 6) continue;

                            const dateStr = checkDate.toISOString().split('T')[0];
                            if (!assignedPerDay[dateStr]) assignedPerDay[dateStr] = 0;

                            if (assignedPerDay[dateStr] < 2) {
                                dbPlans.push({
                                    id: `magic-nontide-${b.id}`,
                                    buoy_id: b.id,
                                    planned_date: dateStr,
                                    notes: '',
                                    is_virtual: true,
                                    virtual_time: null
                                });
                                assignedPerDay[dateStr]++;
                                break;
                            }
                        }
                    }
                }
            }

            setPlannedEntries(dbPlans);
        } catch (err) {
            console.error("Failed to load planning", err);
        }
    };

    useEffect(() => {
        refreshPlanning();
    }, [buoys]); // Re-fetch when buoys are updated

    const tableRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

    const handleSelectBuoy = (id: string | null) => {
        setSelectedBuoyId(id);
        if (id && tableRefs.current[id]) {
            tableRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const getStatusLabel = (buoy: DeployedBuoy) => {
        if (buoy.status === 'Maintenance') return 'Aandacht';
        if (buoy.status === 'Hidden') return 'Verborgen';
        if (buoy.status === 'Lost') return 'Vermist';
        if (buoy.nextServiceDue && new Date(buoy.nextServiceDue) < new Date()) return 'Niet OK';
        return 'OK';
    };

    const handleUpdateBuoy = (updatedBuoy: DeployedBuoy) => {
        if (!updatedBuoy) return;
        setBuoys(prev => prev.map(b => b && b.id === updatedBuoy.id ? updatedBuoy : b));
        setEditingBuoy(prev => prev?.id === updatedBuoy.id ? updatedBuoy : prev);
    };

    const handleDeleteBuoy = (id: string) => {
        const buoy = buoys.find(b => b.id === id);
        if (buoy) setRetrievingBuoy(buoy);
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredAndSortedBuoys = useMemo(() => {
        return buoys
            .filter(buoy => {
                const matchesSearch =
                    buoy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (buoy.buoyType?.color || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (buoy.buoyType?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

                const matchesVisibility = showHidden || buoy.status !== 'Hidden';
                const statusLabel = getStatusLabel(buoy);
                const isExtern = !!(buoy as any).metadata?.external_customer;
                const isPlanned = plannedEntries.some(p => p.buoy_id === buoy.id);
                let matchesStatusFilter = false;
                if (statusFilter === 'all') matchesStatusFilter = true;
                else if (statusFilter === 'gepland') matchesStatusFilter = isPlanned;
                else if (statusFilter === 'extern') matchesStatusFilter = isExtern;
                else matchesStatusFilter = statusLabel.toLowerCase() === statusFilter.toLowerCase();

                return matchesSearch && matchesVisibility && matchesStatusFilter;
            })
            .sort((a, b) => {
                let comparison = 0;
                if (sortField === 'name') {
                    comparison = (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: 'base' });
                }
                else if (sortField === 'status') {
                    comparison = getStatusLabel(a).localeCompare(getStatusLabel(b));
                }
                else if (sortField === 'type') {
                    comparison = (a.buoyType?.name || "Z Onbekend").localeCompare(b.buoyType?.name || "Z Onbekend");
                }
                else if (sortField === 'maintenance') {
                    const dateA = a.nextServiceDue ? new Date(a.nextServiceDue).getTime() : Infinity;
                    const dateB = b.nextServiceDue ? new Date(b.nextServiceDue).getTime() : Infinity;
                    comparison = dateA - dateB;
                }
                else if (sortField === 'extern') {
                    const nameA = ((a as any).metadata?.customer_name || '').toLowerCase();
                    const nameB = ((b as any).metadata?.customer_name || '').toLowerCase();
                    comparison = nameA.localeCompare(nameB);
                }

                else if (sortField === 'gepland') {
                    const aPlan = plannedEntries.find(p => p.buoy_id === a.id);
                    const bPlan = plannedEntries.find(p => p.buoy_id === b.id);

                    if (aPlan && bPlan) {
                        // both planned, sort by exact date + time
                        const getExactDate = (plan: any) => {
                            const d = new Date(plan.planned_date);
                            if (plan.is_virtual && plan.virtual_time) {
                                const [h, m] = plan.virtual_time.split(':');
                                d.setHours(parseInt(h, 10), parseInt(m || '0', 10), 0, 0);
                            }
                            return d.getTime();
                        };
                        comparison = getExactDate(aPlan) - getExactDate(bPlan);
                    } else if (aPlan && !bPlan) {
                        return -1; // Force planned to top, explicitly ignoring asc/desc inversion below
                    } else if (!aPlan && bPlan) {
                        return 1;  // Force non-planned to bottom
                    } else {
                        // neither planned, sort alphabetically by name as fallback
                        comparison = (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: 'base' });
                    }
                }

                // If one is planned and the other isn't, we already returned abruptly above to guarantee Top-placement.
                // Otherwise apply asc/desc flip
                return sortOrder === 'asc' ? comparison : -comparison;
            });
    }, [buoys, searchTerm, sortField, sortOrder, showHidden, statusFilter, plannedEntries]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
        return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-500" /> : <ArrowDown className="w-3 h-3 ml-1 text-blue-500" />;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[500px_1fr] gap-6">
                {/* Left Column: Map */}
                <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-120px)] flex flex-col gap-6">
                    <div className="bg-app-surface rounded-xl border border-app-border p-4 shadow-sm relative overflow-hidden flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                <h3 className="text-lg font-bold text-app-text-primary">Kaart</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={clsx(
                                        "w-8 h-4 rounded-full relative transition-colors duration-200",
                                        showHidden ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700"
                                    )}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={showHidden}
                                            onChange={(e) => setShowHidden(e.target.checked)}
                                        />
                                        <div className={clsx(
                                            "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm",
                                            showHidden ? "translate-x-4" : "translate-x-0"
                                        )} />
                                    </div>
                                    <span className="text-[10px] font-medium text-app-text-secondary group-hover:text-app-text-primary transition-colors">Toon Verborgen</span>
                                </label>

                                {selectedBuoyId && (
                                    <button
                                        onClick={() => handleSelectBuoy(null)}
                                        className="text-[10px] text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1"
                                    >
                                        <Undo2 className="w-3 h-3" /> Wis
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-app-border bg-app-bg flex-1 relative min-h-[300px]">
                            <BuoyMap
                                buoys={filteredAndSortedBuoys}
                                selectedBuoyId={selectedBuoyId}
                                onSelect={handleSelectBuoy}
                                activeZone={activeZone}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Table Section */}
                <div className="flex flex-col gap-6 overflow-hidden">
                    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-app-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-app-surface sticky top-0 z-20">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Ship className="w-5 h-5 text-app-text-secondary" />
                                    <h2 className="text-lg font-bold text-app-text-primary">Uitgelegd ({filteredAndSortedBuoys.length})</h2>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center flex-1 justify-end">
                                <div className="flex bg-app-bg border border-app-border rounded-lg p-1 w-full sm:w-auto overflow-x-auto custom-scrollbar shrink-0">
                                    <button onClick={() => setStatusFilter('all')} className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap", statusFilter === 'all' ? "bg-app-surface text-app-text-primary shadow" : "text-app-text-secondary hover:text-app-text-primary")}>Alles</button>
                                    <button onClick={() => setStatusFilter('ok')} className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap", statusFilter === 'ok' ? "bg-green-100 text-green-700 shadow" : "text-app-text-secondary hover:text-green-700")}>OK</button>
                                    <button onClick={() => setStatusFilter('niet ok')} className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap", statusFilter === 'niet ok' ? "bg-red-100 text-red-700 shadow" : "text-app-text-secondary hover:text-red-700")}>Niet OK</button>
                                    <button onClick={() => setStatusFilter('aandacht')} className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap", statusFilter === 'aandacht' ? "bg-orange-100 text-orange-700 shadow" : "text-app-text-secondary hover:text-orange-700")}>Aandacht</button>
                                    <button onClick={() => setStatusFilter('gepland')} className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap", statusFilter === 'gepland' ? "bg-purple-100 text-purple-700 shadow" : "text-app-text-secondary hover:text-purple-600")}>Gepland</button>
                                    <button onClick={() => setStatusFilter('extern')} className={clsx("px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap", statusFilter === 'extern' ? "bg-blue-100 text-blue-700 shadow" : "text-app-text-secondary hover:text-blue-600")}>Extern</button>
                                </div>

                                <div className="relative w-full max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-secondary" />
                                    <input
                                        type="text"
                                        placeholder="Zoek boei..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-10 py-2 bg-app-bg border border-app-border rounded-lg text-sm text-app-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-secondary hover:text-app-text-primary transition-colors"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
                            <table className="w-full text-left text-sm text-app-text-secondary border-collapse">
                                <thead className="bg-app-surface text-app-text-primary font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm border-b border-app-border">
                                    <tr>
                                        <th className="px-3 md:px-6 py-4 cursor-pointer hover:bg-app-surface-hover/50 transition-colors w-full sm:w-auto" onClick={() => toggleSort('name')}>
                                            <div className="flex items-center">Boei Naam <SortIcon field="name" /></div>
                                        </th>
                                        <th className="hidden sm:table-cell px-3 md:px-6 py-4 cursor-pointer hover:bg-app-surface-hover/50 transition-colors" onClick={() => toggleSort('type')}>
                                            <div className="flex items-center">Type <SortIcon field="type" /></div>
                                        </th>
                                        <th className="hidden md:table-cell px-4 py-4">
                                            <div className="flex items-center">Onderdelen</div>
                                        </th>
                                        <th className="hidden sm:table-cell px-3 md:px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center cursor-pointer hover:text-blue-600 transition-colors w-max space-x-1" onClick={() => toggleSort('maintenance')}>
                                                    <span>Onderhoud</span> <SortIcon field="maintenance" />
                                                </div>
                                                <div className="flex items-center cursor-pointer hover:text-purple-600 text-gray-400 transition-colors w-max space-x-1" onClick={() => toggleSort('gepland')}>
                                                    <span className="text-[9px] uppercase tracking-wider font-bold">Ingepland</span> <SortIcon field="gepland" />
                                                </div>
                                            </div>
                                        </th>
                                        <th className="hidden sm:table-cell px-3 md:px-6 py-4 cursor-pointer hover:bg-app-surface-hover/50 transition-colors" onClick={() => toggleSort('status')}>
                                            <div className="flex items-center">Status <SortIcon field="status" /></div>
                                        </th>
                                        <th className="hidden lg:table-cell px-6 py-4 cursor-pointer hover:bg-app-surface-hover/50 transition-colors" onClick={() => toggleSort('extern')}>
                                            <div className="flex items-center"><Building2 className="w-3 h-3 mr-1 text-blue-400" />Externe Klant <SortIcon field="extern" /></div>
                                        </th>
                                        <th className="px-3 md:px-6 py-4 text-right whitespace-nowrap hidden sm:table-cell">Acties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-app-border">
                                    {filteredAndSortedBuoys.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-app-text-secondary italic">
                                                Geen boeien gevonden die voldoen aan de zoekcriteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAndSortedBuoys.map((buoy) => (
                                            <React.Fragment key={buoy.id}>
                                                <tr
                                                    ref={el => { tableRefs.current[buoy.id] = el; }}
                                                    onClick={() => handleSelectBuoy(selectedBuoyId === buoy.id ? null : buoy.id)}
                                                    className={clsx("cursor-pointer transition-all border-l-4", {
                                                        "bg-blue-500/5 border-l-blue-500 ring-1 ring-inset ring-blue-500/10": selectedBuoyId === buoy.id,
                                                        "bg-orange-50/50 border-l-orange-500": buoy.status === 'Maintenance' && selectedBuoyId !== buoy.id,
                                                        "border-l-transparent hover:bg-app-surface-hover/30": selectedBuoyId !== buoy.id && buoy.status !== 'Maintenance',
                                                        "opacity-50 grayscale-[0.5]": buoy.status === 'Hidden'
                                                    })}
                                                >
                                                    <td className="px-3 md:px-6 py-5 md:py-4">
                                                        <div className="flex items-start gap-4">
                                                            <BuoyIcon
                                                                color={getBuoyDisplayColor(buoy)}
                                                                type={`${buoy.buoyType?.name || ''} ${buoy.metadata?.boei_soort || ''} ${buoy.metadata?.model || ''} ${buoy.name}`}
                                                                size="sm"
                                                                className="shrink-0 w-8 h-8 mt-1"
                                                            />
                                                            <div className="flex flex-col justify-center min-w-0 pr-2 flex-1">
                                                                <span className="font-bold text-app-text-primary text-[16px] leading-tight truncate mb-2">{buoy.name}</span>
                                                                {/* Mobile only: toon status + planning inline, with better spacing and bigger badges */}
                                                                <div className="flex sm:hidden flex-wrap items-center gap-2">
                                                                    {buoy.status === 'Maintenance' ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wide bg-orange-100/90 text-orange-700 border border-orange-200/50"><AlertTriangle className="w-3 h-3" />AANDACHT</span>
                                                                    ) : buoy.status === 'Lost' ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wide bg-red-100/90 text-red-700 border border-red-200/50">VERMIST</span>
                                                                    ) : buoy.status === 'Hidden' ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wide bg-gray-100/90 text-gray-600 border border-gray-200/50">VERBORGEN</span>
                                                                    ) : (buoy.nextServiceDue && new Date(buoy.nextServiceDue) < new Date()) ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wide bg-[#E53935] text-white shadow-sm"><AlertTriangle className="w-3 h-3 text-white" />NIET OK</span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wide bg-green-100/90 text-green-700 border border-green-200/50">OK</span>
                                                                    )}
                                                                    {/* Planning info op mobiel - clearer typography */}
                                                                    {(() => {
                                                                        const planned = plannedEntries.find(p => p.buoy_id === buoy.id);
                                                                        if (planned) {
                                                                            const timeStr = planned.virtual_time || '';
                                                                            let constraintStr = '';
                                                                            if (buoy.tideRestriction === 'Hoog water') constraintStr = 'HW';
                                                                            if (buoy.tideRestriction === 'Laag water') constraintStr = 'LW';

                                                                            return (
                                                                                <span className={clsx(
                                                                                    "inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md border",
                                                                                    planned.is_virtual && planned.virtual_time ? "bg-purple-100/70 text-purple-700 border-purple-200/50" : "bg-blue-50 text-blue-700 border-blue-200/50"
                                                                                )}>
                                                                                    <Calendar className={clsx("w-3.5 h-3.5", planned.is_virtual && planned.virtual_time ? "text-purple-600" : "text-blue-600")} />
                                                                                    {new Date(planned.planned_date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' })}
                                                                                    {(timeStr || constraintStr) && (
                                                                                        <span className={clsx(
                                                                                            "ml-0.5 opacity-80 border-l pl-1.5 flex items-center gap-1",
                                                                                            planned.is_virtual && planned.virtual_time ? "border-purple-300" : "border-blue-300"
                                                                                        )}>
                                                                                            {timeStr}
                                                                                            {constraintStr && <span className={clsx("text-[9px] px-1 rounded", planned.is_virtual && planned.virtual_time ? "bg-purple-200/50" : "bg-blue-200/50")}>{constraintStr}</span>}
                                                                                        </span>
                                                                                    )}
                                                                                </span>
                                                                            );
                                                                        }
                                                                        if (buoy.nextServiceDue) return (
                                                                            <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold bg-gray-50 px-2 py-1 rounded-md border border-gray-200/50">
                                                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                                                {new Date(buoy.nextServiceDue).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                                            </span>
                                                                        );
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 font-medium">
                                                        <div className="flex flex-col gap-1">
                                                            <span>{(buoy.buoyType?.name && buoy.buoyType.name !== "Onbekend") ? buoy.buoyType.name : (buoy.metadata?.model || buoy.metadata?.boei_soort || "Onbekend")}</span>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-4 py-3 md:py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            {/* Lamp */}
                                                            {buoy.metadata?.light && (
                                                                <div className="flex items-center gap-1 flex-wrap">
                                                                    <Lightbulb className="w-3 h-3 text-yellow-500 shrink-0" />
                                                                    {buoy.light?.serialNumber ? (
                                                                        <span className="text-[10px] font-bold text-blue-600 font-mono">
                                                                            {buoy.light.serialNumber}
                                                                        </span>
                                                                    ) : null}
                                                                    {buoy.lightCharacter && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">{buoy.lightCharacter}</span>
                                                                    )}
                                                                    <div className="flex items-center gap-0.5">
                                                                        {buoy.metadata.light.ble && <span title="BLE"><Bluetooth className="w-3 h-3 text-blue-500" /></span>}
                                                                        {buoy.metadata.light.gps && <span title="GPS"><Navigation className="w-3 h-3 text-indigo-500" /></span>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Chain */}
                                                            {buoy.metadata?.chain && (
                                                                <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                                                    <ChainIcon color={buoy.metadata.chain.type || 'Zwart'} size="sm" className="!w-2 !h-2" />
                                                                    <span className="font-medium text-gray-700">
                                                                        {(buoy.metadata.chain.type || 'Ketting')
                                                                            .replace(/^Ketting\s+/i, '')
                                                                            .replace(/\b\d+[A-Z\d-]+\b/g, '') // Remove model codes like 200BC
                                                                            .trim() || 'Ketting'}
                                                                    </span>
                                                                    {(() => {
                                                                        const length = buoy.metadata.chain.length || buoy.metadata.chain.lengte;
                                                                        const thickness = buoy.metadata.chain.thickness || buoy.metadata.chain.dikte;
                                                                        if (!length && !thickness) return null;
                                                                        return (
                                                                            <span className="text-gray-400">
                                                                                ({length || '?'}{String(length).toLowerCase().includes('m') ? '' : 'm'}
                                                                                {thickness ? ` / ${thickness}${String(thickness).toLowerCase().includes('mm') ? '' : 'mm'}` : ''})
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </span>
                                                            )}
                                                            {/* Sinker */}
                                                            {buoy.metadata?.sinker && (
                                                                <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                                                    <StoneIcon shape={buoy.metadata.sinker.type || 'Rond'} size="sm" className="!w-2.5 !h-2.5" />
                                                                    <span className="font-medium text-gray-700">
                                                                        {(() => {
                                                                            const weight = String(buoy.metadata.sinker.weight || buoy.metadata.sinker.gewicht || '').trim();
                                                                            let type = (buoy.metadata.sinker.type || '').replace(/^Steen\s+/i, '').trim();
                                                                            if (weight && type.includes(weight)) {
                                                                                type = type.replace(weight, '').trim();
                                                                            }
                                                                            return `${weight} ${type}`.trim() || 'Steen';
                                                                        })()}
                                                                    </span>
                                                                </span>
                                                            )}
                                                            {!buoy.metadata?.light && !buoy.metadata?.chain && !buoy.metadata?.sinker && (
                                                                <span className="text-[10px] text-gray-300">—</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            {/* Maintenance Status */}
                                                            {buoy.nextServiceDue && (
                                                                <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", {
                                                                    "bg-red-500/10 text-red-500": new Date(buoy.nextServiceDue) < new Date(),
                                                                    "bg-green-500/10 text-green-500": new Date(buoy.nextServiceDue) >= new Date()
                                                                })}>
                                                                    {new Date(buoy.nextServiceDue).toLocaleDateString('nl-BE')}
                                                                </span>
                                                            )}
                                                            {/* Tide Restriction */}
                                                            {buoy.tideRestriction && buoy.tideRestriction !== 'Altijd' && (
                                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-sm uppercase tracking-wider">
                                                                    {buoy.tideRestriction}
                                                                </span>
                                                            )}
                                                            {/* Planned Status */}
                                                            {(() => {
                                                                const activePlan = plannedEntries.find(p => p.buoy_id === buoy.id);
                                                                if (activePlan) {
                                                                    return (
                                                                        <div className={clsx("flex flex-col gap-1 mt-1", activePlan.is_virtual ? "opacity-90 grayscale-[0.2]" : "")}>
                                                                            <span className={clsx(
                                                                                "text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm flex items-center w-max gap-1",
                                                                                activePlan.is_virtual && activePlan.virtual_time ? "bg-purple-500 animate-none" : "bg-blue-600 animate-pulse"
                                                                            )}>
                                                                                <Calendar className="w-2.5 h-2.5" />
                                                                                {activePlan.is_virtual && activePlan.virtual_time ? "TIDE-MATCH:" : "GEPLAND:"} {new Date(activePlan.planned_date).toLocaleDateString('nl-BE')} {activePlan.is_virtual && activePlan.virtual_time ? `(${activePlan.virtual_time})` : ''}
                                                                                {activePlan.is_virtual && activePlan.virtual_time && <Wand2 className="w-2.5 h-2.5 ml-0.5" />}
                                                                            </span>
                                                                            {activePlan.notes && activePlan.is_virtual && (
                                                                                <span className="text-[9px] text-purple-600 italic line-clamp-2 max-w-[200px] leading-tight">
                                                                                    {activePlan.notes}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}

                                                            {!buoy.nextServiceDue && !plannedEntries.some(p => p.buoy_id === buoy.id) && (
                                                                <span className="text-[10px] text-gray-400 italic">Geen datum</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4">
                                                        {buoy.status === 'Maintenance' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                AANDACHT
                                                            </span>
                                                        ) : buoy.status === 'Hidden' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-tighter">
                                                                Verborgen
                                                            </span>
                                                        ) : buoy.status === 'Lost' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-tighter">
                                                                Vermist
                                                            </span>
                                                        ) : (buoy.nextServiceDue && new Date(buoy.nextServiceDue) < new Date()) ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white border border-red-700 uppercase tracking-tighter shadow-sm">
                                                                <AlertTriangle className="w-3 h-3 text-white" />
                                                                NIET OK
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 uppercase tracking-tighter">
                                                                OK
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="hidden lg:table-cell px-6 py-3 md:py-4">
                                                        {(() => {
                                                            const meta = (buoy as any).metadata;
                                                            if (!meta?.external_customer) return <span className="text-[10px] text-gray-300">—</span>;
                                                            return (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="flex items-center gap-1">
                                                                        <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                                                                        <span className="text-xs font-bold text-app-text-primary">{meta.customer_name || '—'}</span>
                                                                    </div>
                                                                    {meta.customer_deploy_date && (
                                                                        <span className="text-[10px] text-app-text-secondary">
                                                                            {new Date(meta.customer_deploy_date).toLocaleDateString('nl-BE')}
                                                                            {meta.customer_pickup_date ? ` → ${new Date(meta.customer_pickup_date).toLocaleDateString('nl-BE')}` : ''}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-2 md:px-6 py-5 md:py-4 text-right">
                                                        {/* Mobile: toon chevron EN map pin als geselecteerd */}
                                                        <div className="flex sm:hidden flex-col items-end justify-between h-full min-h-[40px]" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleSelectBuoy(selectedBuoyId === buoy.id ? null : buoy.id); }}
                                                                className="p-1.5 hover:bg-app-surface-hover rounded-lg text-app-text-secondary transition-all"
                                                            >
                                                                {selectedBuoyId === buoy.id
                                                                    ? <ChevronUp className="w-5 h-5 text-blue-500" />
                                                                    : <ChevronDown className="w-5 h-5 text-gray-400" />
                                                                }
                                                            </button>
                                                            {selectedBuoyId === buoy.id && (
                                                                <div className="mt-auto pr-1">
                                                                    <MapPin className="w-4 h-4 text-blue-500 animate-bounce shadow-sm rounded-full" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Desktop: toon alle actie-knoppen */}
                                                        <div className="hidden sm:flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => setMaintenanceBuoy(buoy)}
                                                                className="p-2 hover:bg-app-surface-hover rounded-lg text-app-text-secondary hover:text-blue-500 transition-all shadow-sm"
                                                                title="Onderhoud Registreren / Inplannen"
                                                            >
                                                                <Hammer className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingBuoy(buoy)}
                                                                className="p-2 hover:bg-app-surface-hover rounded-lg text-app-text-secondary hover:text-app-text-primary transition-all shadow-sm"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => handleDeleteBuoy(buoy.id)} className="p-2 hover:bg-blue-500/10 rounded-lg text-app-text-secondary hover:text-blue-600 transition-all shadow-sm"><Undo2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {selectedBuoyId === buoy.id && (
                                                    <tr className="bg-app-bg/50 border-l-4 border-l-blue-500">
                                                        <td colSpan={7} className="px-3 md:px-6 py-4 md:py-6 font-geist">
                                                            {/* Mobile: toon volledige boei details inclusief type, onderdelen, planning en actie-knoppen */}
                                                            <div className="flex flex-col gap-4">
                                                                {/* Boei details sectie — altijd zichtbaar in uitklap */}
                                                                <div className="grid grid-cols-2 gap-3 sm:hidden">
                                                                    <div className="bg-app-surface rounded-lg p-3 border border-app-border">
                                                                        <div className="text-[9px] uppercase font-bold text-app-text-secondary/60 mb-1">Type</div>
                                                                        <div className="text-xs font-semibold text-app-text-primary">{(buoy.buoyType?.name && buoy.buoyType.name !== 'Onbekend') ? buoy.buoyType.name : (buoy.metadata?.model || buoy.metadata?.boei_soort || 'Onbekend')}</div>
                                                                    </div>
                                                                    <div className="bg-app-surface rounded-lg p-3 border border-app-border">
                                                                        <div className="text-[9px] uppercase font-bold text-app-text-secondary/60 mb-1">Zone</div>
                                                                        <div className="text-xs font-semibold text-app-text-primary">{buoy.zone || '—'}</div>
                                                                    </div>
                                                                    {buoy.nextServiceDue && (
                                                                        <div className="bg-app-surface rounded-lg p-3 border border-app-border">
                                                                            <div className="text-[9px] uppercase font-bold text-app-text-secondary/60 mb-1">Laatste onderhoud</div>
                                                                            <div className="text-xs font-semibold text-app-text-primary">{new Date(buoy.nextServiceDue).toLocaleDateString('nl-BE')}</div>
                                                                        </div>
                                                                    )}
                                                                    {(() => {
                                                                        const planned = plannedEntries.find(p => p.buoy_id === buoy.id);
                                                                        if (!planned) return null;
                                                                        return (
                                                                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                                                                <div className="text-[9px] uppercase font-bold text-purple-500/80 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Ingepland</div>
                                                                                <div className="text-xs font-semibold text-purple-700">{new Date(planned.planned_date).toLocaleDateString('nl-BE')}</div>
                                                                                {planned.virtual_time && <div className="text-[10px] text-purple-600 mt-1 font-bold">{planned.virtual_time}</div>}
                                                                                {buoy.tideRestriction && buoy.tideRestriction !== 'Altijd' && <div className="text-[9px] font-black underline text-purple-500 uppercase tracking-widest mt-0.5">{buoy.tideRestriction}</div>}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    {/* Onderdelen overzicht */}
                                                                    <div className="col-span-2 bg-app-surface rounded-lg p-3 border border-app-border">
                                                                        <div className="text-[9px] uppercase font-bold text-app-text-secondary/60 mb-2">Onderdelen</div>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {buoy.metadata?.light ? <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-200">💡 {buoy.metadata.light.character || buoy.metadata.light.type || 'Gekoppeld'}</span> : <span className="text-[10px] text-gray-400">💡 geen lamp</span>}
                                                                            {buoy.metadata?.chain ? <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">⛓️ {buoy.metadata.chain.type || 'Gekoppeld'}</span> : null}
                                                                            {buoy.metadata?.sinker ? <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">🪨 {buoy.metadata.sinker.type || 'Gekoppeld'}</span> : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Actie-knoppen op mobiel */}
                                                                <div className="flex sm:hidden items-center gap-2" onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => setMaintenanceBuoy(buoy)}
                                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-sm font-bold shadow-sm"
                                                                    >
                                                                        <Hammer className="w-4 h-4" /> Onderhoud
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingBuoy(buoy)}
                                                                        className="flex items-center justify-center gap-2 py-2.5 px-3 bg-app-surface hover:bg-app-surface-hover border border-app-border text-app-text-primary rounded-lg transition-all text-sm font-bold"
                                                                    >
                                                                        <Pencil className="w-4 h-4" /> Bewerken
                                                                    </button>
                                                                    <button onClick={() => handleDeleteBuoy(buoy.id)} className="flex items-center justify-center py-2.5 px-3 bg-app-surface hover:bg-app-surface-hover border border-app-border text-app-text-secondary rounded-lg transition-all text-sm">
                                                                        <Undo2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                {/* Desktop: alleen onderhoud history */}
                                                                <div className="hidden sm:block">
                                                                    <MaintenanceHistoryDetails buoy={buoy} onUpdate={handleUpdateBuoy} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Edit Dialog */}
                    {
                        editingBuoy && (
                            <EditDeployedBuoyDialog
                                buoy={editingBuoy}
                                buoyConfigurations={buoyConfigurations}
                                availableLamps={availableLamps}
                                availableChains={availableChains}
                                availableStones={availableStones}
                                existingCustomers={Array.from(new Set(buoys.map(b => (b as any).metadata?.customer_name).filter(Boolean))) as string[]}
                                onClose={() => setEditingBuoy(null)}
                                onUpdate={handleUpdateBuoy}
                                onDelete={handleDeleteBuoy}
                            />
                        )
                    }

                    {/* Maintenance Dialog */}
                    {
                        maintenanceBuoy && (
                            <MaintenanceDialog
                                buoy={maintenanceBuoy}
                                onClose={() => setMaintenanceBuoy(null)}
                                onUpdate={(updated) => {
                                    handleUpdateBuoy(updated);
                                    refreshPlanning();
                                }}
                                onEdit={() => {
                                    setEditingBuoy(maintenanceBuoy);
                                    setMaintenanceBuoy(null);
                                }}
                            />
                        )
                    }

                    {/* Retrieve Dialog */}
                    {
                        retrievingBuoy && (
                            <RetrieveBuoyDialog
                                buoy={retrievingBuoy}
                                onClose={() => setRetrievingBuoy(null)}
                                onSuccess={(id) => setBuoys(prev => prev.filter(b => b.id !== id))}
                            />
                        )
                    }
                </div>
            </div>
        </div >
    );
}

import { updateMaintenanceHistory, deleteMaintenanceHistory } from '@/app/actions';

function MaintenanceHistoryDetails({ buoy, onUpdate }: { buoy: DeployedBuoy, onUpdate: (buoy: DeployedBuoy) => void }) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingLog, setEditingLog] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const LIMIT = 5;

    const fetchHistory = useCallback((fetchPage = 0) => {
        setLoading(true);
        fetch(`/api/buoys/${buoy.id}/maintenance?page=${fetchPage}&limit=${LIMIT}`)
            .then(res => res.json())
            .then(resData => {
                const data = resData.data || [];
                const count = resData.count || 0;
                setHistory(prev => fetchPage === 0 ? data : [...prev, ...data]);
                setHasMore((fetchPage + 1) * LIMIT < count);
                setPage(fetchPage);
            })
            .catch(err => {
                console.error("Failed to load history", err);
                if (fetchPage === 0) setHistory([]);
            })
            .finally(() => setLoading(false));
    }, [buoy.id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory, buoy.id]);

    const handleDelete = async (id: string) => {
        try {
            const res = await deleteMaintenanceHistory(id);
            if (res.success) {
                setConfirmingDeleteId(null);
                fetchHistory(0);
                if (res.buoy) onUpdate(res.buoy);
            } else {
                console.error('Delete failed:', res.message);
            }
        } catch (e: any) {
            console.error('Delete error:', e);
        }
    };

    if (loading) return <div className="text-xs text-center py-4 text-app-text-secondary animate-pulse">Historiek laden...</div>;

    if (history.length === 0) return (
        <div className="text-xs text-center py-4 text-app-text-secondary italic flex flex-col items-center gap-2">
            <span className="bg-app-surface-hover p-2 rounded-full"><Ship className="w-4 h-4 opacity-50" /></span>
            Geen onderhoudshistoriek gevonden voor deze boei.
        </div>
    );

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-2 flex items-center gap-2">
                <Hammer className="w-3 h-3" /> Onderhoudshistoriek
            </h4>
            <div className="grid gap-3">
                {history.map((log: any) => (
                    <div key={log.id} className="bg-app-surface rounded-xl p-4 border border-app-border flex flex-col gap-3 shadow-sm group hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-app-bg p-2 rounded-lg">
                                    <Hammer className="w-4 h-4 text-app-text-secondary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-app-text-primary">{new Date(log.service_date).toLocaleDateString('nl-BE')}</span>
                                    <span className="text-[10px] text-app-text-secondary uppercase tracking-wider font-semibold">{log.technician || 'Onbekend'}</span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingLog(log); }}
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Volledig bewerken"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                {confirmingDeleteId === log.id ? (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                                            className="px-2 py-1 text-[10px] font-bold bg-red-500 text-white rounded-lg transition-colors hover:bg-red-600"
                                        >
                                            Verwijderen
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(null); }}
                                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(log.id); }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Verwijderen"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="text-sm text-app-text-secondary italic bg-app-bg/50 px-3 py-2 rounded-lg border border-app-border/30 border-l-2 border-l-app-border">
                            {log.notes || log.description || '—'}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {log.metadata?.chain && (
                                <div className="flex items-center gap-2 bg-blue-100 text-blue-900 px-3 py-1.5 rounded-xl border border-blue-300 text-xs font-semibold">
                                    <Link className="w-3.5 h-3.5" />
                                    <span>{log.metadata.replacement_names?.chain || "Ketting"}</span>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-white text-[10px] font-bold",
                                        log.metadata.chain_lost ? "bg-red-600" : "bg-orange-600"
                                    )}>
                                        {log.metadata.chain_lost ? "Kwijt" : "Stuk"}
                                    </span>
                                </div>
                            )}
                            {log.metadata?.light && (
                                <div className="flex items-center gap-2 bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-semibold">
                                    <Lightbulb className="w-3.5 h-3.5" />
                                    <span>{log.metadata.replacement_names?.light || "Lamp"}</span>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-white text-[10px] font-bold",
                                        log.metadata.light_lost ? "bg-red-600" : "bg-orange-600"
                                    )}>
                                        {log.metadata.light_lost ? "Kwijt" : "Stuk"}
                                    </span>
                                </div>
                            )}
                            {log.metadata?.sinker && (
                                <div className="flex items-center gap-2 bg-slate-200 text-slate-900 px-3 py-1.5 rounded-xl border border-slate-400 text-xs font-semibold">
                                    <Hammer className="w-3.5 h-3.5" />
                                    <span>{log.metadata.replacement_names?.sinker || "Steen"}</span>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-white text-[10px] font-bold",
                                        log.metadata.sinker_lost ? "bg-red-600" : "bg-orange-600"
                                    )}>
                                        {log.metadata.sinker_lost ? "Kwijt" : "Stuk"}
                                    </span>
                                </div>
                            )}
                            {log.metadata?.status === 'Maintenance' && (
                                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-800 font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Aandacht Nodig
                                </span>
                            )}
                            {log.metadata?.buoy_cleaned && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Boei afgespoten
                                </span>
                            )}
                            {log.metadata?.light_tested && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Lamp getest
                                </span>
                            )}

                        </div>
                    </div>
                ))}
            </div>

            {editingLog && buoy && (
                <MaintenanceDialog
                    buoy={buoy}
                    logToEdit={editingLog}
                    onClose={() => setEditingLog(null)}
                    onUpdate={(updatedBuoy) => {
                        setEditingLog(null);
                        fetchHistory(0);
                        onUpdate(updatedBuoy);
                    }}
                />
            )}

            {hasMore && (
                <button
                    onClick={(e) => { e.stopPropagation(); fetchHistory(page + 1); }}
                    className="w-full mt-2 py-2 border border-app-border rounded-xl text-[10px] font-bold uppercase tracking-wider text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-hover transition-colors"
                >
                    {loading ? "Laden..." : "Laad oudere rapporten"}
                </button>
            )}
        </div>
    );
}
