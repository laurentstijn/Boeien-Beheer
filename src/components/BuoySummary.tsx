import clsx from "clsx";
import { BuoyIcon } from "./BuoyIcon";

interface BuoySummaryProps {
    assets: any[];
}

export function BuoySummary({ assets }: BuoySummaryProps) {
    // For counting in the "Aantal" column, only count complete/assembled
    // But for showing reserve column, count all reserve items

    // Define buoy models and their expected colors
    const models = [
        {
            name: "JFC MARINE 1800",
            colors: ["Geel", "Groen", "Rood"]
        },
        {
            name: "Mobilis AQ1500",
            colors: ["Groen", "Rood", "Geel"]
        },
        {
            name: "SEALITE SLB 1500",
            colors: ["Rood"]
        },
        {
            name: "JET 2000",
            colors: ["Blauw/Geel", "Geel/Zwart", "Groen", "Rood", "Zwart/Geel/Zwart"]
        },
        {
            name: "JET 9000",
            colors: ["Rood", "Zwart", "Groen", "Geel"]
        },
        {
            name: "JFC MARINE 1250",
            colors: ["Rood"]
        },
        {
            name: "Mobilis BC1241/BC1242",
            colors: ["Geel"]
        }
    ];

    return (
        <div className="space-y-6 mb-8">
            {models.map((model) => {
                // Calculate stats for this model
                const modelAssets = assets.filter((a: any) => a.metadata?.model === model.name);
                const totalCount = modelAssets.length;

                if (totalCount === 0) return null; // Don't show models with no assets

                const colorStats = model.colors.map(color => {
                    const colorAssets = modelAssets.filter((a: any) => a.metadata?.color === color);

                    // Count only complete/assembled for "Aantal" column
                    const completeAssembledCount = colorAssets.filter((a: any) =>
                        a.metadata?.isComplete || a.metadata?.isAssembled
                    ).length;

                    // Count reserve separately
                    const reserve = colorAssets.filter((a: any) => a.metadata?.isReserve).length;
                    const maintenance = colorAssets.filter((a: any) => a.status === 'maintenance').length;

                    return {
                        color,
                        count: completeAssembledCount,
                        reserve,
                        maintenance
                    };
                });

                return (
                    <div key={model.name} className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-app-surface/50">
                            <h3 className="font-semibold text-app-text-primary">{model.name}</h3>
                            <span className="text-sm text-app-text-secondary">Totaal: {totalCount}</span>
                        </div>
                        <table className="w-full text-left text-sm text-app-text-secondary">
                            <thead className="bg-app-bg text-app-text-primary font-medium uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4 w-16">Item</th>
                                    <th className="px-6 py-4">Kleur</th>
                                    <th className="px-6 py-4 text-center">Aantal</th>
                                    <th className="px-6 py-4 text-center">Reserve Drijflichamen</th>
                                    <th className="px-6 py-4 text-center">In Onderhoud</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-app-border">
                                {colorStats.filter(stat => stat.count > 0 || stat.reserve > 0).map((stat) => (
                                    <tr key={stat.color} className="hover:bg-app-surface-hover transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="w-8 h-8 rounded-full bg-app-bg border border-app-border flex items-center justify-center">
                                                <BuoyIcon color={stat.color} size="sm" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-app-text-primary">{stat.color}</td>
                                        <td className="px-6 py-4 text-center font-bold text-app-text-primary">{stat.count}</td>
                                        <td className="px-6 py-4 text-center text-app-text-secondary">{stat.reserve}</td>
                                        <td className="px-6 py-4 text-center text-app-text-secondary">{stat.maintenance}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
    );
}
