"use client";

import { useMemo, useState, useEffect } from "react";
import { Ship, Calendar, AlertTriangle, Printer, Clock, Droplets, Wand2 } from "lucide-react";
import clsx from "clsx";

interface RapportenClientProps {
    initialBuoys: any[];
}

export function RapportenClient({ initialBuoys }: RapportenClientProps) {
    const defaultDays = 10;
    const [daysLookahead, setDaysLookahead] = useState(defaultDays);
    const [tidePredictions, setTidePredictions] = useState<any>(null);

    const [plannedEntries, setPlannedEntries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generatePlanning = async () => {
            if (!initialBuoys || initialBuoys.length === 0) {
                setIsLoading(false);
                return;
            }

            try {
                const todayStrStrict = new Date().toISOString().split('T')[0];
                const limitDate = new Date();
                limitDate.setDate(limitDate.getDate() + daysLookahead);
                limitDate.setHours(23, 59, 59, 999);

                let overdueBuoys = initialBuoys.filter(b => {
                    if (b.status === 'Hidden' || b.status === 'Lost' || b.status === 'Maintenance') return false;

                    if (b.status === 'Niet OK') return true;

                    if (!b.nextServiceDue) return false;
                    return new Date(b.nextServiceDue) <= limitDate;
                });

                const tier1 = overdueBuoys.filter(b => b.status === 'Niet OK');
                const tier2 = overdueBuoys.filter(b => b.status !== 'Niet OK');

                tier1.sort((a, b) => new Date(a.nextServiceDue || 0).getTime() - new Date(b.nextServiceDue || 0).getTime());
                tier2.sort((a, b) => new Date(a.nextServiceDue || 0).getTime() - new Date(b.nextServiceDue || 0).getTime());

                let sortedOverdue = [...tier1, ...tier2];

                const assignedPerDay: Record<string, number> = {};
                const dbPlans: any[] = [];

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
                                        buoy: b,
                                        planned_date: win.date,
                                        notes: `Lokaal Hoogwater (${stationObj?.name || 'Onbekend'}) om ${win.time} (${win.level.toFixed(2)}m).`,
                                        virtual_time: win.time
                                    });
                                    assignedPerDay[win.date]++;
                                    break;
                                }
                            }
                        } else {
                            // Non-tide buoy tracking
                            for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
                                const checkDate = new Date(cursorDate);
                                checkDate.setDate(checkDate.getDate() + dayOffset);

                                const dOfWeek = checkDate.getDay();
                                if (dOfWeek === 0 || dOfWeek === 6) continue;

                                const dateStr = checkDate.toISOString().split('T')[0];
                                if (!assignedPerDay[dateStr]) assignedPerDay[dateStr] = 0;

                                if (assignedPerDay[dateStr] < 2) {
                                    dbPlans.push({
                                        buoy: b,
                                        planned_date: dateStr,
                                        notes: '',
                                        virtual_time: null
                                    });
                                    assignedPerDay[dateStr]++;
                                    break;
                                }
                            }
                        }
                    }
                }

                // Sort the final printed list chronically so the report reads like a day-to-day calendar
                dbPlans.sort((a, b) => {
                    const timeA = new Date(a.planned_date).getTime();
                    const timeB = new Date(b.planned_date).getTime();
                    return timeA - timeB;
                });

                setPlannedEntries(dbPlans);
            } catch (err) {
                console.error("Failed to generate report planning", err);
            } finally {
                setIsLoading(false);
            }
        };

        generatePlanning();
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
                        <span className="font-bold print:text-black">{plannedEntries.length} Inplanningen</span>
                    </div>
                </div>

                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left text-sm print:text-xs">
                        <thead className="bg-app-bg text-app-text-secondary border-b border-app-border print:bg-transparent print:text-black">
                            <tr>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Datum Inplanning</th>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider w-16 print:px-2">#</th>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Gepland</th>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Boei Naam</th>
                                <th className="px-6 py-3 font-bold uppercase tracking-wider print:px-2">Vervaldatum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border print:divide-gray-300">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-app-text-secondary print:text-black print:py-4">
                                        Planning berekenen...
                                    </td>
                                </tr>
                            ) : plannedEntries.length > 0 ? plannedEntries.map((plan, idx) => {
                                const buoy = plan.buoy;
                                const isOverdue = buoy.nextServiceDue && new Date(buoy.nextServiceDue) < new Date();

                                return (
                                    <tr key={`${buoy.id}-${idx}`} className="hover:bg-app-surface-hover print:hover:bg-transparent">
                                        <td className="px-6 py-4 print:px-2 print:py-2 align-top pt-5">
                                            <div className="flex flex-col gap-1 opacity-90">
                                                <span
                                                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                                    className={clsx(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm flex items-center w-max gap-1",
                                                        plan.virtual_time ? "bg-purple-500" : "bg-blue-600"
                                                    )}
                                                >
                                                    <Calendar className="w-2.5 h-2.5" />
                                                    {plan.virtual_time ? "TIDE-MATCH:" : "GEPLAND:"} {new Date(plan.planned_date).toLocaleDateString('nl-BE')} {plan.virtual_time ? `(${plan.virtual_time})` : ''}
                                                    {plan.virtual_time && <Wand2 className="w-2.5 h-2.5 ml-0.5" />}
                                                </span>
                                                {plan.notes && (
                                                    <span className="text-[9px] text-purple-600 italic line-clamp-2 max-w-[200px] leading-tight mt-1">
                                                        {plan.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-app-text-primary print:text-black print:px-2 print:py-2 align-top pt-5">
                                            {buoy.name}
                                        </td>
                                        <td className="px-6 py-4 text-app-text-secondary print:text-black print:px-2 print:py-2 align-top pt-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full border border-gray-300 shadow-sm flex-shrink-0" style={{ backgroundColor: buoy.buoyType?.color === 'rood' ? '#dc2626' : buoy.buoyType?.color === 'groen' ? '#16a34a' : buoy.buoyType?.color === 'zwart' ? '#000' : buoy.buoyType?.color === 'wit' ? '#fff' : '#facc15' }} />
                                                <span>{buoy.buoyType?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-app-text-secondary print:text-black print:px-2 print:py-2 align-top pt-5">
                                            {typeof buoy.location === 'object' && buoy.location && buoy.location.lat ? `${buoy.location.lat.toFixed(5)}, ${buoy.location.lng.toFixed(5)}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 print:px-2 print:py-2 align-top pt-5">
                                            {buoy.nextServiceDue ? (
                                                <span
                                                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                                                    className={clsx(
                                                        "text-[11px] font-bold px-2 py-0.5 rounded shadow-sm text-center inline-block",
                                                        isOverdue
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-green-100 text-green-700"
                                                    )}
                                                >
                                                    {new Date(buoy.nextServiceDue).toLocaleDateString('nl-BE')}
                                                </span>
                                            ) : (
                                                <span className="text-orange-500 font-bold print:text-orange-700">Aandacht / Geen Datum</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-app-text-secondary print:text-black print:py-4 italic">
                                        Geen planning gegenereerd. Alles is up-to-date!
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
