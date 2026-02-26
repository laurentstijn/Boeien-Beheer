"use client";

import { useMemo, useState, useEffect } from "react";
import { Ship, Calendar, AlertTriangle, Printer, Clock, Droplets } from "lucide-react";
import clsx from "clsx";

interface RapportenClientProps {
    initialBuoys: any[];
}

export function RapportenClient({ initialBuoys }: RapportenClientProps) {
    const defaultDays = 10;
    const [daysLookahead, setDaysLookahead] = useState(defaultDays);
    const [tidePredictions, setTidePredictions] = useState<any>(null);

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                // Fetch up to end of lookahead + a few extra days for safety
                const res = await fetch(`/api/tide/predictions?days=${daysLookahead + 5}`);
                if (res.ok) {
                    const data = await res.json();
                    setTidePredictions(data);
                }
            } catch (e) {
                console.error("Failed to load tide predictions");
            }
        };
        fetchPredictions();
    }, [daysLookahead]);

    const getNearestStation = (lat: number, lng: number) => {
        if (!tidePredictions?.stations || tidePredictions.stations.length === 0) return null;
        return tidePredictions.stations.reduce((prev: any, curr: any) => {
            const prevDist = Math.sqrt(Math.pow(prev.lat - lat, 2) + Math.pow(prev.lng - lng, 2));
            const currDist = Math.sqrt(Math.pow(curr.lat - lat, 2) + Math.pow(curr.lng - lng, 2));
            return currDist < prevDist ? curr : prev;
        });
    };

    const buoysToService = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limitDate = new Date(today);
        limitDate.setDate(limitDate.getDate() + daysLookahead);

        return initialBuoys
            .filter(b => b.status !== "Hidden" && b.status !== "Lost")
            .filter(b => {
                if (b.status === "Maintenance" || b.status === "Niet OK") return true; // Always include if they strictly need attention

                if (!b.nextServiceDue) return false;
                const dueDate = new Date(b.nextServiceDue);

                return dueDate <= limitDate;
            })
            .sort((a, b) => {
                const dateA = a.nextServiceDue ? new Date(a.nextServiceDue).getTime() : 0;
                const dateB = b.nextServiceDue ? new Date(b.nextServiceDue).getTime() : 0;
                return dateA - dateB;
            })
            .slice(0, daysLookahead * 2);
    }, [initialBuoys, daysLookahead]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-app-surface border border-app-border rounded-xl print:hidden gap-4">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-app-text-primary flex items-center gap-2">
                        <Clock className="w-4 h-4 text-app-text-secondary" />
                        Periode (dagen):
                    </label>
                    <input
                        type="number"
                        value={daysLookahead}
                        onChange={(e) => setDaysLookahead(Math.max(1, parseInt(e.target.value) || 10))}
                        className="w-20 bg-app-bg border border-app-border rounded-lg px-2 py-1 text-app-text-primary text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                    />
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-sm active:scale-95 text-sm"
                >
                    <Printer className="w-4 h-4" />
                    Print Rapport
                </button>
            </div>

            <div className="bg-app-surface rounded-xl border border-app-border shadow-sm print:shadow-none print:border-none">
                <div className="p-4 border-b border-app-border print:border-b-2 print:border-black flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-app-text-primary print:text-black">Onderhoudsrapport ({daysLookahead} dagen, max {daysLookahead * 2} boeien)</h2>
                        <p className="text-xs text-app-text-secondary print:text-gray-700">Gegenereerd op {new Date().toLocaleDateString('nl-BE')}</p>
                    </div>
                    <div className="flex items-center gap-2 text-app-text-secondary">
                        <Ship className="w-5 h-5 print:text-black" />
                        <span className="font-bold print:text-black">{buoysToService.length} Boeien</span>
                    </div>
                </div>

                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left text-sm print:text-xs">
                        <thead className="bg-app-bg text-app-text-secondary border-b border-app-border print:bg-transparent print:text-black">
                            <tr>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Boei Naam</th>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Type & Kleur</th>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Locatie</th>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Vervaldatum</th>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Getij</th>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border print:divide-gray-300">
                            {buoysToService.length > 0 ? buoysToService.map((buoy) => {
                                const isOverdue = buoy.nextServiceDue && new Date(buoy.nextServiceDue) < new Date();
                                const statusLabel = buoy.status === 'Maintenance' ? 'Aandacht Nodig' :
                                    isOverdue ? 'Te Laat' : 'Gepland';

                                return (
                                    <tr key={buoy.id} className="hover:bg-app-surface-hover print:hover:bg-transparent">
                                        <td className="px-6 py-4 font-bold text-app-text-primary print:text-black print:px-2 print:py-2">
                                            {buoy.name}
                                        </td>
                                        <td className="px-6 py-4 text-app-text-secondary print:text-black print:px-2 print:py-2 flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: buoy.buoyType?.color === 'rood' ? '#dc2626' : buoy.buoyType?.color === 'groen' ? '#16a34a' : buoy.buoyType?.color === 'zwart' ? '#000' : buoy.buoyType?.color === 'wit' ? '#fff' : '#facc15' }} />
                                            {buoy.buoyType?.name}
                                        </td>
                                        <td className="px-6 py-4 text-app-text-secondary print:text-black print:px-2 print:py-2">
                                            {typeof buoy.location === 'object' && buoy.location && buoy.location.lat ? `${buoy.location.lat.toFixed(5)}, ${buoy.location.lng.toFixed(5)}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 print:px-2 print:py-2">
                                            {buoy.nextServiceDue ? (
                                                <span className={clsx(
                                                    "font-bold",
                                                    isOverdue ? "text-red-600 print:text-red-700" : "text-app-text-primary print:text-black"
                                                )}>
                                                    {new Date(buoy.nextServiceDue).toLocaleDateString('nl-BE')}
                                                </span>
                                            ) : (
                                                <span className="text-orange-500 font-bold print:text-orange-700">Geen Datum</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-app-text-secondary print:text-black print:px-2 print:py-2 text-xs">
                                            <div className="font-semibold">{buoy.tideRestriction}</div>
                                            {(() => {
                                                if (!buoy.tideRestriction || buoy.tideRestriction === 'Geen' || !tidePredictions) return null;
                                                const hasLoc = buoy.location && buoy.location.lat;
                                                const station = hasLoc ? getNearestStation(buoy.location.lat, buoy.location.lng) : null;

                                                if (!station || !tidePredictions.predictions?.[station.name]) return null;

                                                let validMatches: any[] = [];

                                                const preds = tidePredictions.predictions[station.name];
                                                if (buoy.tideRestriction === 'Hoog water') {
                                                    const hwList = preds.highWaters || [];
                                                    const todayStr = new Date().toISOString().split('T')[0];
                                                    const now = new Date();

                                                    // Filter for matches that are today or later, value >= 4.0, hour between 11-16, and not weekend
                                                    validMatches = hwList.filter((h: any) => {
                                                        if (h.date < todayStr) return false;
                                                        if (h.level < 4.0) return false;

                                                        // Ensure we don't suggest times that have already passed today
                                                        const parts = h.time.split(':');
                                                        const hNum = parseInt(parts[0], 10);
                                                        const mNum = parseInt(parts[1] || '0', 10);

                                                        const exactTimeObj = new Date(h.date);
                                                        exactTimeObj.setHours(hNum, mNum, 0, 0);
                                                        if (exactTimeObj < now) return false;

                                                        const dObj = new Date(h.date);
                                                        const dayOfWeek = dObj.getDay();
                                                        if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Skip Sunday/Saturday

                                                        return hNum >= 11 && hNum <= 16;
                                                    }).slice(0, 3); // Take top 3 upcoming slots
                                                } else if (buoy.tideRestriction === 'Laag water') {
                                                    // Simple fallback for laag water if needed
                                                    const targetDateStr = (!buoy.nextServiceDue || isOverdue) ? new Date().toISOString().split('T')[0] : new Date(buoy.nextServiceDue).toISOString().split('T')[0];
                                                    validMatches = (preds.lowWaters || []).filter((l: any) => l.date === targetDateStr);
                                                }

                                                if (validMatches.length === 0) return null;

                                                return (
                                                    <div className="mt-1.5 flex flex-col gap-1 text-[10px] bg-purple-50 p-2 rounded border border-purple-200 print:bg-transparent print:border-none print:p-0 print:mt-0 text-purple-800 print:text-gray-600">
                                                        <div className="flex items-center gap-1 font-bold">
                                                            <Droplets className="w-3 h-3 text-purple-600 print:text-gray-600" />
                                                            Kansberekening ({station.name}):
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 pl-4">
                                                            {validMatches.map((match: any, idx: number) => {
                                                                const dObj = new Date(match.date);
                                                                const dStr = `${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}`;
                                                                return (
                                                                    <div key={idx} className="flex items-center gap-1.5">
                                                                        <span className="font-semibold">{dStr}</span>
                                                                        <span className="text-purple-600/50 print:hidden">•</span>
                                                                        <span className="font-bold bg-white print:bg-transparent px-1 rounded shadow-sm print:shadow-none border border-purple-100 print:border-none">{match.time}</span>
                                                                        <span className="text-[9px] text-purple-700/70 italic">({match.level.toFixed(2)}m)</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 print:px-2 print:py-2">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border print:bg-transparent",
                                                statusLabel === 'Aandacht Nodig' ? "bg-orange-100 text-orange-700 border-orange-200 print:border-orange-500 print:text-orange-800" :
                                                    statusLabel === 'Te Laat' ? "bg-red-600 text-white border-red-700 shadow-sm print:border-red-600 print:text-red-700" :
                                                        "bg-blue-100 text-blue-700 border-blue-200 print:border-gray-400 print:text-black"
                                            )}>
                                                {statusLabel === 'Te Laat' || statusLabel === 'Aandacht Nodig' ? <AlertTriangle className={clsx("w-3 h-3", statusLabel === 'Te Laat' ? "text-white print:text-red-700" : "text-orange-600 print:text-orange-800")} /> : <Calendar className="w-3 h-3" />}
                                                {statusLabel}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-app-text-secondary print:text-black print:py-4 italic">
                                        Geen boeien gevonden die onderhoud nodig hebben in deze periode.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
