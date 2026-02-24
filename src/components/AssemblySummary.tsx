
import React from 'react';
import { Package, AlertTriangle, CheckCircle2, Boxes } from 'lucide-react';
import clsx from 'clsx';

interface AssemblyPotential {
    id: string; // "JET 9000 Rood"
    model: string; // "JET 9000"
    color: string; // "Rood"
    potential: number;
    bottlenecks: { name: string; category: string; required: number; available: number }[];
    components: { name: string; category: string; quantity: number; available: number }[];
}

interface AssemblySummaryProps {
    potentials: AssemblyPotential[];
}

export function AssemblySummary({ potentials }: AssemblySummaryProps) {
    // Group potentials by model
    const groupedPotentials = potentials.reduce((acc, p) => {
        if (!acc[p.model]) {
            acc[p.model] = [];
        }
        acc[p.model].push(p);
        return acc;
    }, {} as Record<string, AssemblyPotential[]>);

    return (
        <div className="space-y-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
                <Boxes className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-app-text-primary">Mogelijke Samenstellingen</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(groupedPotentials).map(([model, variants]) => (
                    <div key={model} className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-sm flex flex-col">
                        <div className="px-6 py-4 border-b border-app-border bg-app-surface/50">
                            <h3 className="font-bold text-lg text-app-text-primary">{model}</h3>
                        </div>

                        <div className="p-0 divide-y divide-app-border">
                            {variants.map(p => (
                                <div key={p.id} className="p-4 hover:bg-app-surface-hover/30 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-3 h-3 rounded-full",
                                                {
                                                    "bg-red-500": p.color === "Rood",
                                                    "bg-green-500": p.color === "Groen",
                                                    "bg-yellow-500": p.color === "Geel",
                                                    "bg-blue-500": p.color === "Blauw" || p.color?.includes("Blauw"),
                                                    "bg-gray-800": p.color === "Zwart",
                                                    "bg-white border border-gray-300": p.color === "Wit"
                                                }
                                            )} />
                                            <span className="font-bold text-app-text-primary">{p.color}</span>
                                        </div>

                                        <div className={clsx(
                                            "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5",
                                            p.potential > 0 ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                                        )}>
                                            {p.potential > 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                            {p.potential} mogelijk
                                        </div>
                                    </div>

                                    <div className="pl-6 space-y-2">
                                        {p.components.map((comp) => {
                                            const isOk = comp.available >= comp.quantity;
                                            return (
                                                <div key={comp.name} className="flex items-center justify-between text-xs">
                                                    <span className="text-app-text-secondary">
                                                        {comp.name}
                                                        {comp.category === "Structuur" && <span className="ml-1 text-[10px] text-blue-500 font-bold uppercase tracking-wider">(Structuur)</span>}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx(
                                                            "font-medium",
                                                            isOk ? "text-app-text-primary" : "text-red-500"
                                                        )}>
                                                            {comp.available}
                                                        </span>
                                                        <span className="text-app-text-secondary opacity-70">/ {comp.quantity}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {p.bottlenecks.length > 0 && (
                                        <div className="mt-3 pl-6">
                                            <p className="text-[10px] font-medium text-red-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Tekort: {p.bottlenecks.map(b => (
                                                    <span key={b.name}>
                                                        {b.name}
                                                        {b.category === "Structuur" && <span className="ml-1 font-bold uppercase tracking-wider text-[9px]">(Structuur)</span>}
                                                    </span>
                                                )).reduce((prev, curr) => [prev, ", ", curr] as any)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
