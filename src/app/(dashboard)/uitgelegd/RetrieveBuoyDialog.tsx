import React, { useState } from 'react';
import { X, Undo2, Check, AlertTriangle, Trash2, Package, Lightbulb, Anchor, Link as LinkIcon, Hexagon } from 'lucide-react';
import { DeployedBuoy } from '@/lib/data';
import clsx from 'clsx';
import { retrieveBuoyWithDispositionsAction } from '@/app/actions';

interface RetrieveBuoyDialogProps {
    buoy: DeployedBuoy;
    onClose: () => void;
    onSuccess: (id: string) => void;
}

type Disposition = 'in_stock' | 'maintenance' | 'broken';

export default function RetrieveBuoyDialog({ buoy, onClose, onSuccess }: RetrieveBuoyDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Extract assets from metadata
    const linkedAssets = [];

    // Hull
    if (buoy.metadata?.buoy_asset_id || buoy.id) {
        linkedAssets.push({
            id: buoy.metadata?.buoy_asset_id || buoy.id,
            name: buoy.name,
            type: 'Hull / Boei',
            icon: Package
        });
    }

    // Lamp
    if (buoy.metadata?.light?.asset_id) {
        linkedAssets.push({
            id: buoy.metadata.light.asset_id,
            name: buoy.light?.serialNumber || buoy.light?.serial_number || buoy.light?.article_number || buoy.metadata?.light?.serial_number || buoy.metadata?.light?.serialNumber || 'Lamp',
            type: 'Lamp',
            icon: Lightbulb
        });
    }

    // Chain
    if (buoy.metadata?.chain?.asset_id) {
        linkedAssets.push({
            id: buoy.metadata.chain.asset_id,
            name: buoy.metadata.chain.type || 'Ketting',
            type: 'Ketting',
            icon: LinkIcon
        });
    }

    // Sinker
    if (buoy.metadata?.sinker?.asset_id) {
        linkedAssets.push({
            id: buoy.metadata.sinker.asset_id,
            name: buoy.metadata.sinker.type || 'Steen',
            type: 'Ankersteen',
            icon: Anchor
        });
    }

    // Topmark
    if (buoy.metadata?.topmark?.asset_id) {
        linkedAssets.push({
            id: buoy.metadata.topmark.asset_id,
            name: buoy.metadata.topmark.serial_number || 'Topteken',
            type: 'Topteken',
            icon: Hexagon
        });
    }

    const [dispositions, setDispositions] = useState<Record<string, Disposition>>(
        Object.fromEntries(linkedAssets.map(a => [a.id, 'in_stock']))
    );

    const handleRetrieve = async () => {
        setIsSubmitting(true);
        try {
            const result = await retrieveBuoyWithDispositionsAction(buoy.id, dispositions);
            if (result.success) {
                onSuccess(buoy.id);
                onClose();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Er is een fout opgetreden.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-app-surface w-full max-w-xl rounded-2xl border border-app-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-app-border flex items-center justify-between bg-app-surface shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Undo2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-app-text-primary">Boei Binnenhalen</h2>
                            <p className="text-xs text-app-text-secondary mt-1">{buoy.name} terugbrengen naar magazijn</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-app-surface-hover rounded-full transition-colors">
                        <X className="w-5 h-5 text-app-text-secondary" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                        <p className="text-sm text-blue-800 leading-relaxed">
                            Geef voor elk onderdeel aan wat de status is bij aankomst in het magazijn.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {linkedAssets.map((asset) => (
                            <div key={asset.id} className="bg-app-bg border border-app-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-app-surface border border-app-border flex items-center justify-center shrink-0">
                                        <asset.icon className="w-5 h-5 text-app-text-secondary" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold text-app-text-secondary uppercase tracking-widest">{asset.type}</div>
                                        <div className="text-sm font-bold text-app-text-primary truncate">{asset.name}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 bg-app-surface p-1 rounded-lg border border-app-border shrink-0">
                                    <button
                                        onClick={() => setDispositions(prev => ({ ...prev, [asset.id]: 'in_stock' }))}
                                        className={clsx(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all",
                                            dispositions[asset.id] === 'in_stock'
                                                ? "bg-green-500 text-white shadow-sm"
                                                : "text-app-text-secondary hover:bg-app-bg"
                                        )}
                                    >
                                        <Check className="w-3 h-3" />
                                        OK
                                    </button>
                                    <button
                                        onClick={() => setDispositions(prev => ({ ...prev, [asset.id]: 'maintenance' }))}
                                        className={clsx(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all",
                                            dispositions[asset.id] === 'maintenance'
                                                ? "bg-amber-500 text-white shadow-sm"
                                                : "text-app-text-secondary hover:bg-app-bg"
                                        )}
                                    >
                                        <AlertTriangle className="w-3 h-3" />
                                        Onderhoud
                                    </button>
                                    <button
                                        onClick={() => setDispositions(prev => ({ ...prev, [asset.id]: 'broken' }))}
                                        className={clsx(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all",
                                            dispositions[asset.id] === 'broken'
                                                ? "bg-red-500 text-white shadow-sm"
                                                : "text-app-text-secondary hover:bg-app-bg"
                                        )}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Stuk
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-app-surface border-t border-app-border flex items-center justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-app-text-secondary hover:text-app-text-primary font-bold text-sm"
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={handleRetrieve}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg active:scale-95 disabled:opacity-50 font-bold text-sm"
                    >
                        {isSubmitting ? "Bezig met verwerken..." : <><Undo2 className="w-4 h-4" /> Binnenhalen Bevestigen</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
