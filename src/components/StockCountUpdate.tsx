'use client';

import { useState, useTransition } from 'react';
import { updateStockCountDate } from '@/app/actions';
import { Calendar, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function StockCountUpdate({ initialDate }: { initialDate: string }) {
    const [date, setDate] = useState(initialDate);
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        startTransition(async () => {
            const res = await updateStockCountDate(date);
            if (res.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        });
    };

    return (
        <div className="bg-app-surface rounded-2xl border border-app-border p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-app-text-primary">Laatste Stock Telling</h3>
                        <p className="text-xs text-app-text-secondary mt-0.5">
                            Update hier de datum van de laatste fysieke voorraadtelling.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="bijv. 23-2-2026"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-4 py-2 bg-app-bg border border-app-border rounded-xl text-sm font-medium text-app-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full md:w-48"
                    />
                    <button
                        onClick={handleSave}
                        disabled={isPending || date === initialDate}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                            saved
                                ? "bg-green-500 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:bg-gray-500"
                        )}
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                            <Check className="w-4 h-4" />
                        ) : null}
                        {saved ? "Opgeslagen" : "Datum Bijwerken"}
                    </button>
                </div>
            </div>
        </div>
    );
}
