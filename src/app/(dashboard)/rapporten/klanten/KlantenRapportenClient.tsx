"use client";

import React, { useState, useRef } from 'react';
import { Building2, ChevronRight, FileText, X, Printer } from 'lucide-react';

export default function KlantenRapportenClient({ customers }: { customers: string[] }) {
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handlePrint = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.print();
        }
    };

    return (
        <>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-app-surface border border-app-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-app-border bg-app-surface/50">
                        <h1 className="text-xl font-bold text-app-text-primary flex items-center gap-3">
                            <Building2 className="w-6 h-6 text-blue-500" />
                            Rapporten Externe Klanten
                        </h1>
                        <p className="text-sm text-app-text-secondary mt-1 max-w-2xl">
                            Selecteer een klant om het overzichtsrapport van al hun uitgelegde boeien en bijbehorende historiek te bekijken of af te drukken.
                        </p>
                    </div>

                    <div className="p-6">
                        {customers.length === 0 ? (
                            <div className="text-center py-12 bg-app-bg/50 rounded-xl border border-app-border/50 border-dashed">
                                <Building2 className="w-8 h-8 text-app-text-secondary/40 mx-auto mb-3" />
                                <p className="text-sm font-medium text-app-text-secondary">Geen externe klanten gevonden.</p>
                                <p className="text-xs text-app-text-secondary/70 mt-1">Markeer boeien als "Externe Klant" bij het uitleggen of bewerken.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {customers.map((customer) => (
                                    <button
                                        key={customer}
                                        onClick={() => setSelectedCustomer(customer)}
                                        className="group flex flex-col p-5 bg-app-bg border border-app-border rounded-xl hover:border-blue-500 hover:shadow-md hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all active:scale-[0.98] text-left"
                                    >
                                        <div className="flex items-center justify-between mb-3 w-full">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-app-surface border border-app-border group-hover:border-blue-200 group-hover:bg-blue-100 text-app-text-secondary group-hover:text-blue-500 transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-app-text-primary text-lg truncate group-hover:text-blue-600 transition-colors w-full">{customer}</h3>
                                        <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-app-text-secondary group-hover:text-blue-500/80">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>Bekijk Historiek Rapport</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Customer Report Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedCustomer(null)}
                    />
                    <div className="relative w-full max-w-5xl h-[90vh] bg-app-surface border border-app-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-app-border bg-app-surface shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5 text-blue-500" />
                                <h2 className="text-lg font-bold text-app-text-primary">{selectedCustomer}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print Rapport
                                </button>
                                <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-1.5 bg-app-bg hover:bg-app-surface-hover text-app-text-secondary rounded-lg transition-colors ml-2"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 w-full bg-gray-100 dark:bg-gray-900 relative">
                            <iframe
                                ref={iframeRef}
                                src={`/rapport/klant/${encodeURIComponent(selectedCustomer)}?embedded=true`}
                                className="w-full h-full border-0 absolute inset-0"
                                title={`Rapport ${selectedCustomer}`}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
