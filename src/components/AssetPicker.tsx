"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';

// Helper: color dot CSS class
export function colorDotClass(color: string) {
    switch (color?.toLowerCase()) {
        case 'geel': return 'bg-yellow-400';
        case 'rood': return 'bg-red-500';
        case 'groen': return 'bg-green-500';
        case 'wit': return 'bg-white border border-gray-300';
        case 'blauw': return 'bg-blue-500';
        case 'zwart': return 'bg-zinc-800';
        default: return 'bg-gray-400';
    }
}

interface AssetPickerProps {
    items: any[];
    value: string;
    onChange: (id: string) => void;
    onAddNew?: () => void;
    placeholder: string;
    className?: string;
}

export default function AssetPicker({ items, value, onChange, onAddNew, placeholder, className }: AssetPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selected = items.find(i => i.id === value);

    const getDisplayName = (item: any) => {
        return item.name || item.type || (Array.isArray(item.items) ? item.items[0]?.name : item.items?.name) || 'Onderdeel';
    };

    const getItemColor = (item: any) => {
        return item.color || item.metadata?.color || item.metadata?.lamp_color || (item.name?.toLowerCase().includes('rood') ? 'rood' : item.name?.toLowerCase().includes('groen') ? 'groen' : item.name?.toLowerCase().includes('geel') ? 'geel' : null);
    };

    const filtered = items.filter(i => {
        const searchStr = (getDisplayName(i) + ' ' + (getItemColor(i) || '')).toLowerCase();
        return searchStr.includes(search.toLowerCase());
    });

    return (
        <div ref={ref} className={clsx("relative w-full", className)}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border bg-app-surface text-sm text-left hover:border-blue-400 transition-colors shadow-sm min-h-[40px]"
            >
                {selected && (
                    <span className={clsx('w-3 h-3 rounded-full flex-shrink-0 shadow-sm', colorDotClass(getItemColor(selected) || ''))} />
                )}
                <span className={clsx('flex-1 truncate font-medium', !selected && 'text-app-text-secondary font-normal')}>
                    {selected ? getDisplayName(selected) : placeholder}
                </span>
                <ChevronDown className={clsx("w-4 h-4 text-app-text-secondary flex-shrink-0 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <div className="absolute z-[100] w-full mt-1 bg-app-surface border border-app-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
                    {/* Search */}
                    <div className="p-2 border-b border-app-border bg-app-surface-hover flex items-center gap-2 relative">
                        <Search className="w-3.5 h-3.5 text-app-text-secondary flex-shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Zoeken op serienummer of type..."
                            className="flex-1 text-xs bg-transparent outline-none text-app-text-primary placeholder:text-app-text-secondary pr-6"
                            onClick={e => e.stopPropagation()}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-app-text-secondary hover:text-app-text-primary transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    {/* Options */}
                    <div className="max-h-60 overflow-y-auto pt-1 pb-1">
                        <button
                            type="button"
                            onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                            className="w-full text-left px-3 py-2 text-xs text-app-text-secondary hover:bg-app-surface-hover transition-colors"
                        >
                            {placeholder}
                        </button>
                        {filtered.length > 0 ? filtered.map(item => {
                            const color = getItemColor(item);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => { onChange(item.id); setOpen(false); setSearch(''); }}
                                    className={clsx(
                                        'w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-app-surface-hover transition-all',
                                        value === item.id && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold'
                                    )}
                                >
                                    <span className={clsx('w-3 h-3 rounded-full flex-shrink-0 shadow-sm', colorDotClass(color || ''))} />
                                    <span className="truncate flex-1">{getDisplayName(item)}</span>
                                    {value === item.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                </button>
                            );
                        }) : (
                            <div className="px-3 py-4 text-center text-xs text-app-text-secondary italic">
                                Geen resultaten gevonden
                            </div>
                        )}
                        {onAddNew && (
                            <div className="p-2 border-t border-app-border mt-1 bg-app-surface-hover">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpen(false);
                                        onAddNew();
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    + Nieuw onderdeel aanmaken
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
