'use client';

import React, { useState, useEffect } from 'react';
import { parseCoordinate, formatDD, formatDMM, formatDMS, parseSmartInput, SmartPasteResult } from '@/lib/coordinates';
import { Copy, Calculator, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CoordinateCalculator() {
    const [smartInput, setSmartInput] = useState('');
    const [smartResult, setSmartResult] = useState<SmartPasteResult | null>(null);

    const [latInput, setLatInput] = useState('');
    const [lngInput, setLngInput] = useState('');

    const [latResult, setLatResult] = useState({ dd: '', dmm: '', dms: '', error: '' });
    const [lngResult, setLngResult] = useState({ dd: '', dmm: '', dms: '', error: '' });

    useEffect(() => {
        if (!smartInput.trim()) {
            setSmartResult(null);
        } else {
            setSmartResult(parseSmartInput(smartInput));
        }
    }, [smartInput]);

    useEffect(() => {
        if (!latInput.trim()) {
            setLatResult({ dd: '', dmm: '', dms: '', error: '' });
        } else {
            const parsed = parseCoordinate(latInput, false);
            if (parsed.error) {
                setLatResult({ dd: '', dmm: '', dms: '', error: parsed.error });
            } else {
                setLatResult({
                    dd: formatDD(parsed.decimal),
                    dmm: formatDMM(parsed.decimal, false),
                    dms: formatDMS(parsed.decimal, false),
                    error: ''
                });
            }
        }
    }, [latInput]);

    useEffect(() => {
        if (!lngInput.trim()) {
            setLngResult({ dd: '', dmm: '', dms: '', error: '' });
        } else {
            const parsed = parseCoordinate(lngInput, true);
            if (parsed.error) {
                setLngResult({ dd: '', dmm: '', dms: '', error: parsed.error });
            } else {
                setLngResult({
                    dd: formatDD(parsed.decimal),
                    dmm: formatDMM(parsed.decimal, true),
                    dms: formatDMS(parsed.decimal, true),
                    error: ''
                });
            }
        }
    }, [lngInput]);

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} gekopieerd!`);
    };

    return (
        <div className="bg-app-surface border border-app-border rounded-xl shadow-lg p-5">
            <h3 className="text-lg font-bold text-app-text-primary mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-500" /> Coördinaten Rekenmachine
            </h3>

            <div className="space-y-6">
                {/* Slim Plakken */}
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-app-text-primary mb-2 flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-purple-500" /> Slim Plakken (Automatisch)
                    </label>
                    <textarea
                        value={smartInput}
                        onChange={(e) => setSmartInput(e.target.value)}
                        placeholder={"Plak volledige coördinaten hier...\nBijv: 143171.72E; 226052.47N\nOf: 51° 14',367 N 004° 22',682 E"}
                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text-primary focus:outline-none focus:border-purple-500 transition-all font-mono text-sm min-h-[80px]"
                    />

                    {smartResult?.error && (
                        <p className="text-xs text-red-500 mt-1">{smartResult.error}</p>
                    )}

                    {smartResult && !smartResult.error && smartResult.lat !== null && smartResult.lng !== null && (
                        <div className="mt-3 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-app-text-secondary">Gedetecteerd formaat:</span>
                                <span className="text-xs font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">{smartResult.formatDetected}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 p-3 bg-app-bg/50 rounded-lg border border-app-border">
                                    <div className="text-xs font-semibold text-app-text-secondary uppercase tracking-wider mb-2">Latitude (Lat / N)</div>
                                    <ResultRow label="DD" value={formatDD(smartResult.lat)} onCopy={() => handleCopy(formatDD(smartResult.lat!), 'Lat DD')} />
                                    <ResultRow label="DMM" value={formatDMM(smartResult.lat, false)} onCopy={() => handleCopy(formatDMM(smartResult.lat!, false), 'Lat DMM')} />
                                    <ResultRow label="DMS" value={formatDMS(smartResult.lat, false)} onCopy={() => handleCopy(formatDMS(smartResult.lat!, false), 'Lat DMS')} />
                                </div>

                                <div className="space-y-1.5 p-3 bg-app-bg/50 rounded-lg border border-app-border">
                                    <div className="text-xs font-semibold text-app-text-secondary uppercase tracking-wider mb-2">Longitude (Lng / E)</div>
                                    <ResultRow label="DD" value={formatDD(smartResult.lng)} onCopy={() => handleCopy(formatDD(smartResult.lng!), 'Lng DD')} />
                                    <ResultRow label="DMM" value={formatDMM(smartResult.lng, true)} onCopy={() => handleCopy(formatDMM(smartResult.lng!, true), 'Lng DMM')} />
                                    <ResultRow label="DMS" value={formatDMS(smartResult.lng, true)} onCopy={() => handleCopy(formatDMS(smartResult.lng!, true), 'Lng DMS')} />
                                </div>
                            </div>

                            <button
                                onClick={() => handleCopy(`${formatDD(smartResult.lat!)}, ${formatDD(smartResult.lng!)}`, 'Lat/Lng paar')}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm mt-2"
                            >
                                <Copy className="w-4 h-4" />
                                Kopieer Lat/Lng paar (DD)
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="h-px bg-app-border flex-1"></div>
                    <span className="text-xs font-medium text-app-text-secondary uppercase tracking-wider">Of handmatig (per component)</span>
                    <div className="h-px bg-app-border flex-1"></div>
                </div>

                {/* Latitude */}
                <div>
                    <label className="block text-sm font-semibold text-app-text-secondary mb-1">Breedtegraad (Latitude / N-S)</label>
                    <input
                        type="text"
                        value={latInput}
                        onChange={(e) => setLatInput(e.target.value)}
                        placeholder="Bijv. 51.22100 of 51° 13.260' N"
                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                    />
                    {latResult.error && <p className="text-xs text-red-500 mt-1">{latResult.error}</p>}

                    {!latResult.error && latInput.trim() && (
                        <div className="mt-2 space-y-1.5 bg-app-bg/50 p-3 rounded-lg border border-app-border">
                            <ResultRow label="DD" value={latResult.dd} onCopy={() => handleCopy(latResult.dd, 'DD')} />
                            <ResultRow label="DMM" value={latResult.dmm} onCopy={() => handleCopy(latResult.dmm, 'DMM')} />
                            <ResultRow label="DMS" value={latResult.dms} onCopy={() => handleCopy(latResult.dms, 'DMS')} />
                        </div>
                    )}
                </div>

                {/* Longitude */}
                <div>
                    <label className="block text-sm font-semibold text-app-text-secondary mb-1">Lengtegraad (Longitude / E-W)</label>
                    <input
                        type="text"
                        value={lngInput}
                        onChange={(e) => setLngInput(e.target.value)}
                        placeholder="Bijv. 4.41720 of 4° 25.032' E"
                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-app-text-primary focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                    />
                    {lngResult.error && <p className="text-xs text-red-500 mt-1">{lngResult.error}</p>}

                    {!lngResult.error && lngInput.trim() && (
                        <div className="mt-2 space-y-1.5 bg-app-bg/50 p-3 rounded-lg border border-app-border">
                            <ResultRow label="DD" value={lngResult.dd} onCopy={() => handleCopy(lngResult.dd, 'DD')} />
                            <ResultRow label="DMM" value={lngResult.dmm} onCopy={() => handleCopy(lngResult.dmm, 'DMM')} />
                            <ResultRow label="DMS" value={lngResult.dms} onCopy={() => handleCopy(lngResult.dms, 'DMS')} />
                        </div>
                    )}
                </div>

                {/* Combined manual result */}
                {!latResult.error && !lngResult.error && latResult.dd && lngResult.dd && (
                    <button
                        onClick={() => handleCopy(`${latResult.dd}, ${lngResult.dd}`, 'Lat/Lng paar')}
                        className="w-full bg-app-surface hover:bg-app-surface-hover text-app-text-primary font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all border border-app-border shadow-sm mt-4"
                    >
                        <Copy className="w-4 h-4 text-blue-500" />
                        Kopieer Handmatige Lat/Lng paar
                    </button>
                )}
            </div>
        </div>
    );
}

function ResultRow({ label, value, onCopy }: { label: string, value: string, onCopy: () => void }) {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between group">
            <span className="text-xs font-semibold text-app-text-secondary w-10">{label}</span>
            <span className="font-mono text-sm text-app-text-primary truncate font-medium flex-1 px-2">{value}</span>
            <button
                onClick={onCopy}
                className="p-1.5 rounded-md hover:bg-blue-500/10 text-app-text-secondary hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Kopieer"
            >
                <Copy className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
