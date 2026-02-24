import { useState, useMemo } from 'react';
import { InventoryItem } from "@/lib/data";
import { Plus, Package, Search, X } from "lucide-react";
import clsx from "clsx";

interface InventoryTableProps {
    items: InventoryItem[];
    title: string;
}

export function InventoryTable({ items, title }: InventoryTableProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredItems = useMemo(() => {
        return items.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.details.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-400" />
                    <h2 className="text-xl font-semibold text-gray-200">{title}</h2>
                    <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full text-xs">
                        {items.reduce((acc, item) => acc + item.stock, 0)} stuks
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Zoeken..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#0a0f14] border border-gray-800 rounded-lg pl-9 pr-10 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                        <Plus className="w-4 h-4" />
                        Nieuw
                    </button>
                </div>
            </div>

            <div className="bg-[#0a0f14] rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#0f161d] text-gray-200 font-medium uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Naam</th>
                            <th className="px-6 py-4">Details</th>
                            <th className="px-6 py-4">Voorraad</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Acties</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    Geen artikelen gevonden in deze categorie.
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                                    <td className="px-6 py-4">{item.details}</td>
                                    <td className="px-6 py-4 font-mono text-gray-300">{item.stock}</td>
                                    <td className="px-6 py-4">
                                        <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", {
                                            "bg-green-500/10 text-green-500": item.status === "OK",
                                            "bg-red-500/10 text-red-500": item.status === "Out of Stock",
                                            "bg-yellow-500/10 text-yellow-500": item.status === "Low Stock",
                                        })}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-500 hover:underline">Bewerk</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
