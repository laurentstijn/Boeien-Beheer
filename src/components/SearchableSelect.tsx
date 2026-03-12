"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';

interface SearchableSelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Selecteer...",
    searchPlaceholder = "Zoeken...",
    className,
    disabled = false
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Reset search when closed
    useEffect(() => {
        if (!open) {
            setSearch('');
        }
    }, [open]);

    const selectedOption = options.find(o => o.value === value);

    const filteredOptions = options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={ref} className={clsx("relative w-full", className)}>
            <button
                type="button"
                disabled={disabled}
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className={clsx(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-app-bg text-sm text-left transition-colors min-h-[40px]",
                    disabled ? "opacity-50 cursor-not-allowed border-app-border" : "border-app-border hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                )}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                    <span className={clsx('truncate', !selectedOption && 'text-app-text-secondary')}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown className={clsx("w-4 h-4 text-app-text-secondary shrink-0 transition-transform", open && "rotate-180")} />
            </button>

            {open && !disabled && (
                <div className="absolute z-[100] min-w-full w-max max-w-[350px] mt-1 bg-app-surface border border-app-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
                    <div className="p-2 border-b border-app-border bg-app-bg/50 flex items-center gap-2">
                        <Search className="w-4 h-4 text-app-text-secondary shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="flex-1 text-sm bg-transparent outline-none text-app-text-primary placeholder:text-app-text-secondary"
                            onClick={e => e.stopPropagation()}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                                className="shrink-0 text-app-text-secondary hover:text-app-text-primary"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                        {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={clsx(
                                    "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-app-surface-hover transition-colors",
                                    value === opt.value && "bg-blue-50/50 text-blue-600 font-medium"
                                )}
                            >
                                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                                <span className="break-words whitespace-normal leading-tight py-0.5">{opt.label}</span>
                            </button>
                        )) : (
                            <div className="px-3 py-4 text-center text-sm text-app-text-secondary">
                                Geen resultaten gevonden
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
