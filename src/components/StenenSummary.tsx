import clsx from "clsx";
import { StoneIcon } from "./StoneIcon";

interface StenenSummaryProps {
    assets: any[];
}

export function StenenSummary({ assets }: StenenSummaryProps) {
    // Define the expected types based on the user's excel sheet
    const types = [
        { weight: "4", shape: "Ovaal" },
        { weight: "3", shape: "Ovaal" },
        { weight: "1.5", shape: "Rond" },
        { weight: "1", shape: "Rond" },
        { weight: "1.5", shape: "Plat" },
        { weight: "0.2", shape: "Vierkant" },
    ];

    const stats = types.map(type => {
        // Filter assets that match this weight and shape
        // We assume metadata contains weight and shape
        // We enable loose matching for weight (string/number)
        const typeAssets = assets.filter(a => {
            const w = a.metadata?.weight?.toString();
            const s = a.metadata?.shape;
            return w === type.weight && s === type.shape;
        });

        const total = typeAssets.length;

        // "Met ketting" logic:
        // Option A: Explicit metadata 'chain_attached'
        // Option B: Status 'deployed' implies it's in use (likely with chain)
        // Option C: Join with chain table?
        // For now, let's look for 'deployed' status as a proxy for "in use / met ketting" 
        // OR check if there is a 'chain' field in metadata.
        // Let's assume for now that if it is DEPLOYED, it has a chain, or if metadata.chain is present.
        const jaCount = typeAssets.filter(a => a.status === 'deployed' || a.metadata?.hasChain === true || a.metadata?.chain === "Ja").length;
        const neeCount = total - jaCount;

        return {
            ...type,
            total,
            jaCount,
            neeCount,
            // Collect unique notes
            notes: Array.from(new Set(typeAssets.map(a => a.metadata?.notes).filter(Boolean))).join(", ")
        };
    });

    return (
        <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden mb-8 shadow-sm">
            <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-app-surface">
                <h3 className="font-bold text-app-text-primary text-lg">Overzicht Stenen</h3>
            </div>
            <table className="w-full text-left text-sm text-app-text-secondary">
                <thead className="bg-app-surface text-app-text-primary font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                        <th className="px-6 py-4 w-16">Item</th>
                        <th className="px-6 py-4">Gewicht (ton)</th>
                        <th className="px-6 py-4">Vorm</th>
                        <th className="px-6 py-4 text-center">Aantal</th>
                        <th className="px-6 py-4 text-center" colSpan={2}>Met Ketting</th>
                        <th className="px-6 py-4">Opmerkingen</th>
                    </tr>
                    <tr>
                        {/* Sub-header for "Met Ketting" */}
                        <th className="px-6 py-0"></th>
                        <th className="px-6 py-0"></th>
                        <th className="px-6 py-0"></th>
                        <th className="px-6 py-0"></th>
                        <th className="px-6 py-2 text-center text-[10px] text-app-text-secondary uppercase border-t border-app-border">Ja</th>
                        <th className="px-6 py-2 text-center text-[10px] text-app-text-secondary uppercase border-t border-app-border">Nee</th>
                        <th className="px-6 py-0"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                    {stats.map((stat, index) => (
                        <tr key={index} className="hover:bg-app-surface-hover/30 transition-colors">
                            <td className="px-6 py-4">
                                <div className="w-8 h-8 rounded-full bg-app-bg border border-app-border flex items-center justify-center">
                                    <StoneIcon shape={stat.shape} size="sm" />
                                </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-app-text-primary">{stat.weight}</td>
                            <td className="px-6 py-4 font-medium">{stat.shape}</td>
                            <td className="px-6 py-4 text-center font-black text-app-text-primary">{stat.total}</td>

                            {/* Ja */}
                            <td className="px-6 py-4 text-center text-app-text-primary font-bold bg-app-surface-hover/20">
                                {stat.jaCount > 0 ? (
                                    <span className="text-blue-500">{stat.jaCount}</span>
                                ) : (
                                    <span className="opacity-20">-</span>
                                )}
                            </td>

                            {/* Nee */}
                            <td className="px-6 py-4 text-center text-app-text-secondary">
                                {stat.neeCount > 0 ? stat.neeCount : <span className="opacity-20">-</span>}
                            </td>

                            <td className="px-6 py-4 text-[11px] italic max-w-xs truncate text-app-text-secondary" title={stat.notes}>
                                {stat.notes}
                            </td>
                        </tr>
                    ))}
                    <tr className="bg-app-surface font-bold text-app-text-primary border-t-2 border-app-border shadow-inner">
                        <td colSpan={3} className="px-6 py-5 text-right uppercase text-[10px] tracking-widest opacity-70">Totaal</td>
                        <td className="px-6 py-5 text-center text-white font-black bg-blue-600 shadow-lg">{stats.reduce((a, b) => a + b.total, 0)}</td>
                        <td className="px-6 py-5 text-center text-blue-500 bg-app-surface-hover/40 font-black">{stats.reduce((a, b) => a + b.jaCount, 0)}</td>
                        <td className="px-6 py-5 text-center text-app-text-secondary opacity-80">{stats.reduce((a, b) => a + b.neeCount, 0)}</td>
                        <td className="px-6 py-5"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
