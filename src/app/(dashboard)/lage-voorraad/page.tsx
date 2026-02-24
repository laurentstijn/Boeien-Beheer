import { getItemsWithStockInfo } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AlertTriangle, Settings } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
    Boei: 'Boeien',
    Ketting: 'Kettingen',
    Steen: 'Stenen',
    Lamp: 'Lampen',
    Topteken: 'Toptekens',
    Sluiting: 'Sluitingen',
    Zinkblok: 'Zinkblokken',
    Structuur: 'Structuren',
};

const normalizeColor = (colorStr: string | undefined, modelName: string | undefined = '') => {
    const lower = (colorStr || modelName || '').toLowerCase();
    if (lower.includes('geel') || lower.includes('yellow') || lower.match(/\by\b/)) return 'Geel';
    if (lower.includes('rood') || lower.includes('red') || lower.match(/\br\b/) || lower.includes('800r') || lower.includes('860r')) return 'Rood';
    if (lower.includes('groen') || lower.includes('green') || lower.match(/\bg\b/) || lower.includes('800g') || lower.includes('860g')) return 'Groen';
    if (lower.includes('wit') || lower.includes('white') || lower.match(/\bw\b/)) return 'Wit';
    return 'Geel';
};

export default async function LageVoorraadPage() {
    const rawItems = await getItemsWithStockInfo();

    // Fetch raw tools for custom Lamp aggregations (to match LampInventory group-by-color UI)
    const { data: assets } = await supabaseAdmin.from('assets').select('*, item:items(name, category)');
    const { data: itemTypes } = await supabaseAdmin.from('items').select('*').eq('category', 'Lamp');

    const lampGroups = new Map<string, { inStock: number, minStock: number }>();
    const colors = ['Geel', 'Rood', 'Groen', 'Wit'];
    colors.forEach(c => lampGroups.set(c, { inStock: 0, minStock: 0 }));

    if (itemTypes && assets) {
        // Accumulate min_stock from itemTypes into color buckets
        itemTypes.forEach(it => {
            const c = normalizeColor(it.name);
            const g = lampGroups.get(c);
            if (g) g.minStock += (it.min_stock_level || 0);
        });

        // Accumulate in_stock from assets into color buckets
        assets.forEach(a => {
            const isLamp = a.item?.category === 'Lamp' || itemTypes.some(it => it.id === a.item_id);
            if (isLamp && a.status === 'in_stock') {
                const c = normalizeColor(a.metadata?.color || a.metadata?.lamp_color, a.item?.name);
                const g = lampGroups.get(c);
                if (g) g.inStock++;
            }
        });
    }

    // Replace individual lamp entries with our aggregated color groups
    let allItems = rawItems.filter(item => item.category !== 'Lamp');

    colors.forEach(c => {
        const g = lampGroups.get(c);
        if (g) {
            let status: 'ok' | 'low' | 'out' = 'ok';
            if (g.inStock === 0 && g.minStock > 0) status = 'out';
            else if (g.inStock < g.minStock) status = 'low';

            // Only push if there's actually a minimum stock set or at least we want to track it
            // actually we just push it, and let the `lowItems` filter below handle it, 
            // but for safety, we only push if we have any items or min stock > 0
            if (g.minStock > 0 || g.inStock > 0) {
                allItems.push({
                    id: `lamp-group-${c}`,
                    name: `Lamp ${c}`,
                    category: 'Lamp',
                    minStock: g.minStock,
                    inStock: g.inStock,
                    deployed: 0,
                    maintenance: 0,
                    specs: {},
                    status
                });
            }
        }
    });
    // Only show items below minimum (exclude items without a min stock set)
    const lowItems = allItems.filter(
        item => item.minStock > 0 && item.status !== 'ok'
    );

    const outItems = lowItems.filter(i => i.status === 'out');
    const warnItems = lowItems.filter(i => i.status === 'low');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-app-text-primary">Lage Voorraad</h1>
                        <p className="text-sm text-app-text-secondary mt-0.5">
                            Artikeltypes die onder hun minimum voorraad zitten.
                        </p>
                    </div>
                </div>
            </div>

            {lowItems.length === 0 ? (
                <div className="bg-app-surface rounded-2xl border border-app-border p-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-7 h-7 text-green-500" />
                    </div>
                    <h3 className="font-bold text-app-text-primary text-lg mb-1">Alles op voorraad!</h3>
                    <p className="text-app-text-secondary text-sm">Alle artikeltypes zijn boven hun minimale voorraad.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Niet op voorraad */}
                    {outItems.length > 0 && (
                        <div className="bg-app-surface rounded-2xl border border-red-500/20 shadow-sm overflow-hidden">
                            <div className="px-6 py-3 border-b border-red-500/20 bg-red-500/5 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <h2 className="font-bold text-red-500 text-sm uppercase tracking-wider">Niet Op Voorraad</h2>
                                <span className="ml-auto text-xs font-bold text-red-500/60">{outItems.length} types</span>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-app-bg/40 text-[10px] font-bold uppercase tracking-wider text-app-text-secondary/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Artikel</th>
                                        <th className="px-6 py-3 text-left">Categorie</th>
                                        <th className="px-6 py-3 text-center">In Opslag</th>
                                        <th className="px-6 py-3 text-center">Minimum</th>
                                        <th className="px-6 py-3 text-center">Tekort</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-app-border/30">
                                    {outItems.map(item => (
                                        <tr key={item.id} className="hover:bg-red-500/5 transition-colors">
                                            <td className="px-6 py-3 font-semibold text-app-text-primary">{item.name}</td>
                                            <td className="px-6 py-3 text-app-text-secondary">{CATEGORY_LABELS[item.category] || item.category}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="font-black text-red-500 text-base">{item.inStock}</span>
                                            </td>
                                            <td className="px-6 py-3 text-center font-mono text-app-text-secondary">{item.minStock}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold">
                                                    −{item.minStock - item.inStock}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Laag */}
                    {warnItems.length > 0 && (
                        <div className="bg-app-surface rounded-2xl border border-yellow-500/20 shadow-sm overflow-hidden">
                            <div className="px-6 py-3 border-b border-yellow-500/20 bg-yellow-500/5 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                <h2 className="font-bold text-yellow-500 text-sm uppercase tracking-wider">Lage Voorraad</h2>
                                <span className="ml-auto text-xs font-bold text-yellow-500/60">{warnItems.length} types</span>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-app-bg/40 text-[10px] font-bold uppercase tracking-wider text-app-text-secondary/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Artikel</th>
                                        <th className="px-6 py-3 text-left">Categorie</th>
                                        <th className="px-6 py-3 text-center">In Opslag</th>
                                        <th className="px-6 py-3 text-center">Minimum</th>
                                        <th className="px-6 py-3 text-center">Tekort</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-app-border/30">
                                    {warnItems.map(item => (
                                        <tr key={item.id} className="hover:bg-yellow-500/5 transition-colors">
                                            <td className="px-6 py-3 font-semibold text-app-text-primary">{item.name}</td>
                                            <td className="px-6 py-3 text-app-text-secondary">{CATEGORY_LABELS[item.category] || item.category}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="font-black text-yellow-500 text-base">{item.inStock}</span>
                                            </td>
                                            <td className="px-6 py-3 text-center font-mono text-app-text-secondary">{item.minStock}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold">
                                                    −{item.minStock - item.inStock}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
