import clsx from "clsx";
import { ChainIcon } from "./ChainIcon";

interface ChainSummaryProps {
    assets: any[]; // The raw asset list
}

export function ChainSummary({ assets }: ChainSummaryProps) {
    // Helper to calculate statistics
    // We expect assets to have name like "Ketting Rood", "Ketting Blauw" etc.
    const types = [
        { name: "Rood", specs: { length: "15m", thickness: "25mm", swivel: "Nee" }, match: "Ketting Rood" },
        { name: "Blauw", specs: { length: "25m", thickness: "25mm", swivel: "Ja" }, match: "Ketting Blauw" },
        { name: "Geel", specs: { length: "25m", thickness: "20mm", swivel: "Ja" }, match: "Ketting Geel" },
        { name: "Wit", specs: { length: "15m", thickness: "20mm", swivel: "Ja" }, match: "Ketting Wit" },
    ];

    const stats = types.map(type => {
        const typeAssets = assets.filter(a => a.name === type.match);
        const total = typeAssets.length;
        const inStock = typeAssets.filter(a => a.status === 'in_stock' || a.status === 'OK').length;
        const deployed = typeAssets.filter(a => a.status === 'deployed').length;

        return {
            ...type,
            total,
            inStock,
            deployed
        };
    });

    return (
        <div className="bg-[#0a0f14] rounded-xl border border-gray-800 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-semibold text-white">Overzicht Kettingen</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#0f161d] text-gray-200 font-medium uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Kleur</th>
                            <th className="px-6 py-4">Lengte</th>
                            <th className="px-6 py-4">Dikte</th>
                            <th className="px-6 py-4 text-center">Met Draainagel</th>
                            <th className="px-6 py-4 text-center">Zonder Draainagel</th>
                            <th className="px-6 py-4 text-center">In Opslag</th>
                            <th className="px-6 py-4 text-center">Uitgelegd</th>
                            <th className="px-6 py-4 text-right font-bold text-white">Totaal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {stats.map((stat) => {
                            // Calculate dynamic counts from assets metadata
                            const typeAssets = assets.filter(a => a.name === stat.match);
                            const countMet = typeAssets.filter(a => a.metadata?.swivel === 'Ja').length;
                            const countZonder = typeAssets.filter(a => a.metadata?.swivel === 'Nee' || !a.metadata?.swivel).length;

                            return (
                                <tr key={stat.name} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
                                            <ChainIcon color={stat.name} size="sm" />
                                        </div>
                                        {stat.name}
                                    </td>
                                    <td className="px-6 py-4">{stat.specs.length}</td>
                                    <td className="px-6 py-4">{stat.specs.thickness}</td>
                                    <td className="px-6 py-4 text-center text-gray-300">{countMet}</td>
                                    <td className="px-6 py-4 text-center text-gray-300">{countZonder}</td>
                                    <td className="px-6 py-4 text-center text-green-500 font-medium">{stat.inStock}</td>
                                    <td className="px-6 py-4 text-center text-blue-500 font-medium">{stat.deployed}</td>
                                    <td className="px-6 py-4 text-right font-bold text-white">{stat.total}</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-[#0f161d]/50 font-semibold text-gray-200">
                            <td colSpan={5} className="px-6 py-4 text-right uppercase text-xs tracking-wider">Totaal</td>
                            <td className="px-6 py-4 text-center text-green-500">{stats.reduce((a, b) => a + b.inStock, 0)}</td>
                            <td className="px-6 py-4 text-center text-blue-500">{stats.reduce((a, b) => a + b.deployed, 0)}</td>
                            <td className="px-6 py-4 text-right text-white">{stats.reduce((a, b) => a + b.total, 0)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
