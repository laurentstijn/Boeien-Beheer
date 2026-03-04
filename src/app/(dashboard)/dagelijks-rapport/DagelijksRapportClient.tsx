"use client";

import React, { useState, useEffect } from "react";
import { Ship, Calendar, AlertTriangle, Printer, Loader2, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface LogEntry {
    id: string;
    description: string;
    metadata: any;
    service_date: string;
    technician: string;
    deployed_buoys: {
        id: string;
        name: string;
        zone: string;
        metadata?: any;
        buoy_configurations: {
            name: string;
            metadata: any;
        };
    };
}

export function DagelijksRapportClient() {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/reports/daily?date=${date}`);
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                } else {
                    console.error("Failed to fetch logs", await res.text());
                }
            } catch (e) {
                console.error("Error fetching daily logs", e);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [date]);

    const formatComponentReplacement = (key: string, metadata: any) => {
        const componentNames: Record<string, string> = {
            chain: 'Ketting',
            light: 'Lamp',
            sinker: 'Steen',
            shackle: 'Sluiting',
            zinc: 'Zinkblok',
            buoy: 'Boei (Body)'
        };
        const name = metadata.replacement_names?.[key] || '(Onbekend)';
        const lost = metadata[`${key}_lost`];
        return (
            <div key={key} className="text-xs">
                <span className="font-semibold">{componentNames[key] || key}:</span> Uitgehaald/Vervangen: {name} {lost ? <span className="text-red-500 font-bold">(Verloren/Aangevaren)</span> : ''}
                {key === 'buoy' && metadata.buoy_replace_reason && (
                    <div className="text-[10px] text-red-600 dark:text-red-400 italic">
                        Reden: {metadata.buoy_replace_reason}
                    </div>
                )}
            </div>
        );
    };

    // Group logs by customer
    const groupedLogs = logs.reduce((acc, log) => {
        const isExternal = log.deployed_buoys?.metadata?.external_customer;
        const customerName = isExternal ? (log.deployed_buoys?.metadata?.customer_name || 'Onbekende Externe Klant') : 'Eigen Beheer';
        if (!acc[customerName]) acc[customerName] = [];
        acc[customerName].push(log);
        return acc;
    }, {} as Record<string, LogEntry[]>);

    const customerGroups = Object.keys(groupedLogs).sort((a, b) => {
        if (a === 'Eigen Beheer') return -1;
        if (b === 'Eigen Beheer') return 1;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-6">
            <style>{`
                @media print { 
                    @page { margin: 0; size: A4; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; } 
                    
                    /* PDF Layout Elements - Only for print */
                    .print-sidebar {
                        position: fixed;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        width: 38px;
                        background-color: #1a6d8d !important;
                        z-index: -10;
                    }

                    .print-header {
                        position: fixed;
                        top: 35px;
                        left: 80px;
                        z-index: 100;
                    }

                    .print-header img {
                        height: 50px;
                        object-fit: contain;
                    }

                    .print-footer-left {
                        position: fixed;
                        bottom: 25px;
                        left: 80px;
                        z-index: 100;
                    }

                    .print-footer-left img {
                        height: 40px;
                        object-fit: contain;
                    }

                    .print-footer-right {
                        position: fixed;
                        bottom: 35px;
                        right: 40px;
                        font-size: 8px;
                        font-weight: 700;
                        color: #000;
                        z-index: 100;
                    }

                    /* Content adjustments for print */
                    .print-container {
                        padding: 130px 40px 80px 80px !important; 
                        max-width: none !important;
                        margin: 0 !important;
                    }
                    .print-container > .print\\:border-none {
                        border: none !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>

            {/* Print Elements (PDF Template) */}
            <div className="print-sidebar hidden print:block"></div>
            <div className="print-header hidden print:block">
                <img src="/extracted_logo_0.png" alt="Agentschap Maritieme Dienstverlening & Kust" />
            </div>
            <div className="print-footer-left hidden print:block">
                <img src="/extracted_logo_1.png" alt="Vlaanderen is maritiem" />
            </div>
            <div className="print-footer-right hidden print:block">
                agentschapmdk.be
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-app-surface border border-app-border rounded-xl print:hidden gap-4">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-app-text-primary flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-app-text-secondary" />
                        Datum:
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-app-bg border border-app-border rounded-lg px-3 py-1.5 text-app-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={() => window.print()}
                    disabled={logs.length === 0 || loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-sm active:scale-95 text-sm"
                >
                    <Printer className="w-4 h-4" />
                    Print Rapport
                </button>
            </div>

            <div className="print-container">
                <div className="bg-app-surface rounded-xl border border-app-border shadow-sm print:shadow-none print:border-none">
                    <div className="p-4 border-b border-app-border print:border-b-2 print:border-black flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-app-text-primary print:text-black">
                                Dagelijks Onderhoudsrapport
                            </h2>
                            <p className="text-xs text-app-text-secondary print:text-gray-700">Datum: {new Date(date).toLocaleDateString('nl-BE')}</p>
                        </div>
                        <div className="flex items-center gap-2 text-app-text-secondary">
                            <Ship className="w-5 h-5 print:text-black" />
                            <span className="font-bold print:text-black">{logs.length} Onderhouden</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto print:overflow-visible">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-app-text-secondary">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                                <p>Ophalen rapporten...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm print:text-xs">
                                <thead className="bg-app-bg text-app-text-secondary border-b border-app-border print:bg-transparent print:text-black">
                                    <tr>
                                        <th className="px-3 md:px-6 py-3 font-bold uppercase tracking-wider print:px-2">Boei Naam</th>
                                        <th className="hidden sm:table-cell px-6 py-3 font-bold uppercase tracking-wider print:px-2 w-48">Uitgevoerd door</th>
                                        <th className="px-3 md:px-6 py-3 font-bold uppercase tracking-wider print:px-2">Acties & Vervangingen</th>
                                        <th className="px-3 md:px-6 py-3 font-bold uppercase tracking-wider print:px-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-app-border print:divide-gray-300">
                                    {customerGroups.length > 0 ? customerGroups.map((groupName) => (
                                        <React.Fragment key={groupName}>
                                            <tr className="bg-app-bg/80 print:bg-gray-100 border-y border-app-border print:border-black">
                                                <td colSpan={4} className="px-6 py-2 font-black text-sm text-app-text-primary print:text-black uppercase tracking-wider">
                                                    {groupName}
                                                </td>
                                            </tr>
                                            {groupedLogs[groupName].map((log) => {
                                                const metadata = log.metadata || {};
                                                const replacedKeys = ['buoy', 'light', 'sinker', 'shackle', 'zinc', 'chain'].filter(k => metadata[k] || metadata[`${k}_lost`]);

                                                return (
                                                    <tr key={log.id} className="hover:bg-app-surface-hover print:hover:bg-transparent">
                                                        <td className="px-3 md:px-6 py-3 md:py-4 font-bold text-app-text-primary print:text-black print:px-2 print:py-2 align-top">
                                                            {log.deployed_buoys?.name || 'Onbekend'}
                                                        </td>
                                                        <td className="hidden sm:table-cell px-6 py-4 text-app-text-secondary print:text-black print:px-2 print:py-2 align-top">
                                                            {log.technician || 'Onbekend'}
                                                            <div className="text-[10px] text-app-text-secondary/60 print:text-gray-500">
                                                                {new Date(log.service_date).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 md:px-6 py-3 md:py-4 text-app-text-secondary print:text-black print:px-2 print:py-2 align-top">
                                                            {log.description ? (
                                                                <div className="mb-2 italic text-app-text-primary print:text-black">{log.description}</div>
                                                            ) : <div className="mb-2 italic text-app-text-secondary/50 print:text-gray-500">Geen algemene notities</div>}

                                                            {(metadata.buoy_cleaned || metadata.light_tested) && (
                                                                <div className="mb-2 flex flex-wrap gap-2">
                                                                    {metadata.buoy_cleaned && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200 print:border-blue-500 print:bg-transparent">
                                                                            ✓ Afgespoten
                                                                        </span>
                                                                    )}
                                                                    {metadata.light_tested && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 print:border-yellow-600 print:bg-transparent">
                                                                            ✓ Lamp getest
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {replacedKeys.length > 0 && (
                                                                <div className="mt-2 space-y-0.5 bg-app-bg/50 p-2 rounded border border-app-border print:bg-transparent print:p-0 print:border-none print:mt-1">
                                                                    <div className="text-[10px] uppercase font-bold text-app-text-secondary/70 mb-1 print:text-black">Vervangingen:</div>
                                                                    {replacedKeys.map(k => formatComponentReplacement(k, metadata))}
                                                                </div>
                                                            )}
                                                            {metadata.light_character && (
                                                                <div className="mt-1 text-xs">
                                                                    <span className="font-semibold">Nieuw karakter:</span> {metadata.light_character}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 md:px-6 py-3 md:py-4 print:px-2 print:py-2 align-top">
                                                            {metadata.status === 'Niet OK' || metadata.status === 'Maintenance' ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border print:bg-transparent bg-red-100 text-red-700 border-red-200 print:border-red-500 print:text-red-800">
                                                                    <AlertTriangle className="w-3 h-3 text-red-600 print:text-red-800" />
                                                                    Niet OK
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border print:bg-transparent bg-green-100 text-green-700 border-green-200 print:border-green-500 print:text-green-800">
                                                                    <CheckCircle2 className="w-3 h-3 text-green-600 print:text-green-800" />
                                                                    OK
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-app-text-secondary print:text-black print:py-4 italic">
                                                Geen onderhoudslogs gevonden voor deze datum.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
