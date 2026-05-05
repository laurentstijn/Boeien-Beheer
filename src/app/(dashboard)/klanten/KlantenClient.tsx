"use client";

import React, { useState, useRef } from 'react';
import { DeployedBuoy } from '@/lib/data';
import { Customer } from '@/lib/db';
import { Plus, Users, Search, Building2, Phone, AlignLeft, Edit2, Archive, MapPin, Calendar, FileText, Layers, X, CheckSquare, Square, Printer } from 'lucide-react';
import { BuoyIcon } from '@/components/BuoyIcon';
import clsx from 'clsx';
import { updateCustomer, deleteCustomer } from './actions'; // I will need to create server actions for this

interface Props {
    initialCustomers: Customer[];
    initialBuoys: DeployedBuoy[];
}

export default function KlantenClient({ initialCustomers, initialBuoys }: Props) {
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // For editing/creating
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    // Report selection
    const [selectedReportBuoys, setSelectedReportBuoys] = useState<Set<string>>(new Set());
    const [showReportPopup, setShowReportPopup] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    
    // Get all buoys for the selected customer
    // A buoy belongs to a customer if its metadata.customer_name matches the customer name
    const customerBuoys = selectedCustomer 
        ? initialBuoys.filter(b => b.metadata?.customer_name === selectedCustomer.name)
        : [];
        
    const activeBuoys = customerBuoys.filter(b => b.status !== 'Archived');
    const archivedBuoys = customerBuoys.filter(b => b.status === 'Archived');

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustomer) return;
        
        try {
            await updateCustomer(editingCustomer);
            if (!customers.find(c => c.id === editingCustomer.id)) {
                setCustomers([...customers, editingCustomer]);
            } else {
                setCustomers(customers.map(c => c.id === editingCustomer.id ? editingCustomer : c));
            }
            setShowEditModal(false);
            if (!selectedCustomerId) setSelectedCustomerId(editingCustomer.id);
        } catch (error) {
            alert('Fout bij opslaan klant.');
        }
    };

    const handleCreateNew = () => {
        setEditingCustomer({
            id: crypto.randomUUID(),
            name: '',
            contact: '',
            notes: ''
        });
        setShowEditModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-app-surface p-4 sm:p-6 rounded-xl shadow-sm border border-app-border">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-app-text-primary tracking-tight">Klanten & Projecten</h1>
                        <p className="text-sm text-app-text-secondary mt-1">Beheer externe klanten en hun historische rapporten.</p>
                    </div>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nieuwe Klant</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
                {/* Left Col: Customer List */}
                <div className="bg-app-surface rounded-xl border border-app-border shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                    <div className="p-4 border-b border-app-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-secondary" />
                            <input
                                type="text"
                                placeholder="Zoek klant..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-app-bg border border-app-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {filteredCustomers.map(customer => (
                            <button
                                key={customer.id}
                                onClick={() => {
                                    setSelectedCustomerId(customer.id);
                                    setSelectedReportBuoys(new Set()); // Reset selections when changing customer
                                }}
                                className={clsx(
                                    "w-full text-left p-3 rounded-lg transition-all flex items-start gap-3",
                                    selectedCustomerId === customer.id 
                                        ? "bg-blue-500/10 border border-blue-500/20" 
                                        : "hover:bg-app-surface-hover border border-transparent"
                                )}
                            >
                                <Building2 className={clsx("w-5 h-5 shrink-0 mt-0.5", selectedCustomerId === customer.id ? "text-blue-500" : "text-app-text-secondary")} />
                                <div>
                                    <div className="font-bold text-app-text-primary">{customer.name}</div>
                                    {(customer.contact || customer.notes) && (
                                        <div className="text-xs text-app-text-secondary line-clamp-1 mt-0.5">
                                            {customer.contact || customer.notes}
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                        {filteredCustomers.length === 0 && (
                            <div className="p-4 text-center text-sm text-app-text-secondary italic">Geen klanten gevonden.</div>
                        )}
                    </div>
                </div>

                {/* Right Col: Details */}
                <div className="bg-app-surface rounded-xl border border-app-border shadow-sm flex flex-col h-[calc(100vh-200px)] overflow-y-auto">
                    {selectedCustomer ? (
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-app-text-primary flex items-center gap-2">
                                        <Building2 className="w-6 h-6 text-blue-500" />
                                        {selectedCustomer.name}
                                    </h2>
                                    <div className="flex flex-col gap-2 mt-4 text-sm text-app-text-secondary">
                                        {selectedCustomer.contact && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4" />
                                                <span>{selectedCustomer.contact}</span>
                                            </div>
                                        )}
                                        {selectedCustomer.notes && (
                                            <div className="flex items-start gap-2">
                                                <AlignLeft className="w-4 h-4 mt-0.5" />
                                                <span className="whitespace-pre-wrap">{selectedCustomer.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowReportPopup(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm transition-all"
                                    >
                                        <Layers className="w-4 h-4" />
                                        <span className="hidden sm:inline">Rapport Bekijken</span>
                                    </button>
                                    <button
                                        onClick={() => { setEditingCustomer(selectedCustomer); setShowEditModal(true); }}
                                        className="p-2 hover:bg-app-surface-hover border border-app-border rounded-lg text-app-text-secondary transition-colors"
                                        title="Klant bewerken"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* Actieve Boeien */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-app-text-secondary flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-green-500" />
                                            Actieve Boeien ({activeBuoys.length})
                                        </h3>
                                        <button 
                                            onClick={() => {
                                                const allIds = activeBuoys.map(b => b.id);
                                                const allSelected = allIds.every(id => selectedReportBuoys.has(id));
                                                const next = new Set(selectedReportBuoys);
                                                if (allSelected) {
                                                    allIds.forEach(id => next.delete(id));
                                                } else {
                                                    allIds.forEach(id => next.add(id));
                                                }
                                                setSelectedReportBuoys(next);
                                            }}
                                            className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-600"
                                        >
                                            Alles (de)selecteren
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {activeBuoys.map(buoy => {
                                            const isSelected = selectedReportBuoys.has(buoy.id);
                                            return (
                                                <div 
                                                    key={buoy.id} 
                                                    onClick={() => {
                                                        const next = new Set(selectedReportBuoys);
                                                        if (isSelected) next.delete(buoy.id);
                                                        else next.add(buoy.id);
                                                        setSelectedReportBuoys(next);
                                                    }}
                                                    className={clsx(
                                                        "p-4 rounded-xl border flex items-start gap-4 cursor-pointer transition-colors",
                                                        isSelected ? "bg-blue-50/50 border-blue-300" : "bg-app-bg border-app-border hover:border-blue-300"
                                                    )}
                                                >
                                                    <div className="pt-1">
                                                        {isSelected ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-app-text-secondary opacity-30" />}
                                                    </div>
                                                    <BuoyIcon 
                                                        color={buoy.buoyType?.color || 'yellow'} 
                                                        type={buoy.buoyType?.name || 'Onbekend'} 
                                                        size="sm" 
                                                        className="w-10 h-10 mt-1" 
                                                    />
                                                    <div>
                                                        <div className="font-bold text-app-text-primary">{buoy.name}</div>
                                                        <div className="text-xs text-app-text-secondary mt-1">
                                                            Uitlegdatum: {new Date(buoy.date || '').toLocaleDateString('nl-BE')}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {activeBuoys.length === 0 && (
                                            <div className="col-span-full p-4 bg-app-bg rounded-xl border border-app-border border-dashed text-sm text-app-text-secondary italic">
                                                Geen actieve boeien.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Historiek / Archief */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-app-text-secondary flex items-center gap-2">
                                            <Archive className="w-4 h-4 text-orange-500" />
                                            Historiek / Binnengehaalde Boeien ({archivedBuoys.length})
                                        </h3>
                                        <button 
                                            onClick={() => {
                                                const allIds = archivedBuoys.map(b => b.id);
                                                const allSelected = allIds.every(id => selectedReportBuoys.has(id));
                                                const next = new Set(selectedReportBuoys);
                                                if (allSelected) {
                                                    allIds.forEach(id => next.delete(id));
                                                } else {
                                                    allIds.forEach(id => next.add(id));
                                                }
                                                setSelectedReportBuoys(next);
                                            }}
                                            className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-600"
                                        >
                                            Alles (de)selecteren
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {archivedBuoys.map(buoy => {
                                            const isSelected = selectedReportBuoys.has(buoy.id);
                                            return (
                                                <div 
                                                    key={buoy.id} 
                                                    onClick={() => {
                                                        const next = new Set(selectedReportBuoys);
                                                        if (isSelected) next.delete(buoy.id);
                                                        else next.add(buoy.id);
                                                        setSelectedReportBuoys(next);
                                                    }}
                                                    className={clsx(
                                                        "p-4 rounded-xl border cursor-pointer transition-colors",
                                                        isSelected ? "bg-blue-50/50 border-blue-300" : "bg-app-bg border-app-border hover:border-blue-300"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-3 border-b border-app-border pb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="pt-0.5">
                                                                {isSelected ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-app-text-secondary opacity-30" />}
                                                            </div>
                                                            <BuoyIcon 
                                                                color={buoy.buoyType?.color || 'yellow'} 
                                                                type={buoy.buoyType?.name || 'Onbekend'} 
                                                                size="sm" 
                                                                className="w-8 h-8 opacity-70 grayscale-[0.5]" 
                                                            />
                                                        <div>
                                                            <div className="font-bold text-app-text-primary line-through opacity-70">{buoy.name}</div>
                                                            <div className="text-xs text-app-text-secondary flex items-center gap-2 mt-0.5">
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(buoy.date || '').toLocaleDateString('nl-BE')} - {buoy.metadata?.archived_date ? new Date(buoy.metadata.archived_date).toLocaleDateString('nl-BE') : 'Onbekend'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Rapporten weergave */}
                                                <div>
                                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-app-text-secondary mb-2 flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> Onderhoudsrapporten
                                                    </h4>
                                                    {/* We fetch logs through the backend, but since they are included in getDeployedBuoys, wait, getDeployedBuoys only gets 1 log (the latest). 
                                                        We might need a separate call or just show a button to open the full history modal. 
                                                        For now, we just note that they are preserved. */}
                                                    <div className="text-xs text-app-text-secondary bg-app-surface-hover p-2 rounded-lg inline-block">
                                                        Historische gegevens en logboeken voor deze boei zijn bewaard in de database.
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })}
                                        {archivedBuoys.length === 0 && (
                                            <div className="p-4 bg-app-bg rounded-xl border border-app-border border-dashed text-sm text-app-text-secondary italic">
                                                Geen historische boeien.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-app-text-secondary p-6">
                            <Building2 className="w-16 h-16 opacity-20 mb-4" />
                            <p>Selecteer een klant aan de linkerkant om de details te bekijken.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit/Create Modal */}
            {showEditModal && editingCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                    <div className="relative bg-app-surface w-full max-w-lg rounded-xl shadow-2xl border border-app-border overflow-hidden flex flex-col max-h-[90vh]">
                        <form onSubmit={handleSaveCustomer} className="flex flex-col h-full">
                            <div className="p-4 border-b border-app-border flex items-center justify-between">
                                <h2 className="text-lg font-bold text-app-text-primary">
                                    {customers.some(c => c.id === editingCustomer.id) ? 'Klant Bewerken' : 'Nieuwe Klant'}
                                </h2>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-app-text-secondary uppercase tracking-wider mb-1">Naam</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={editingCustomer.name}
                                        onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-app-text-secondary uppercase tracking-wider mb-1">Contact / Telefoon</label>
                                    <input 
                                        type="text" 
                                        value={editingCustomer.contact || ''}
                                        onChange={e => setEditingCustomer({...editingCustomer, contact: e.target.value})}
                                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-app-text-secondary uppercase tracking-wider mb-1">Notities</label>
                                    <textarea 
                                        rows={4}
                                        value={editingCustomer.notes || ''}
                                        onChange={e => setEditingCustomer({...editingCustomer, notes: e.target.value})}
                                        className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>
                            </div>
                            <div className="p-4 border-t border-app-border flex justify-end gap-3 bg-app-bg">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-app-surface text-sm font-bold rounded-lg border border-app-border hover:bg-app-surface-hover">
                                    Annuleren
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm">
                                    Opslaan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Report Popup */}
            {showReportPopup && selectedCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReportPopup(false)} />
                    <div className="relative w-full max-w-5xl h-[90vh] bg-app-surface border border-app-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-bg">
                            <h2 className="font-bold flex items-center gap-2 text-app-text-primary">
                                <Layers className="w-5 h-5 text-purple-500" /> 
                                Klant Historiek Rapport ({selectedReportBuoys.size > 0 ? `${selectedReportBuoys.size} boeien geselecteerd` : 'Alle boeien'})
                            </h2>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => iframeRef.current?.contentWindow?.print()} 
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                                >
                                    <Printer className="w-4 h-4" />
                                    Afdrukken / PDF
                                </button>
                                <button onClick={() => setShowReportPopup(false)} className="p-1.5 hover:bg-app-surface-hover rounded-lg text-app-text-secondary transition-colors ml-2">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <iframe
                            ref={iframeRef}
                            src={`/rapport/klant/${encodeURIComponent(selectedCustomer.name)}?embedded=true${selectedReportBuoys.size > 0 ? `&buoys=${Array.from(selectedReportBuoys).join(',')}` : ''}`}
                            className="w-full flex-1 bg-white"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
