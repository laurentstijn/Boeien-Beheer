import React, { useState, useRef, useEffect } from 'react';
import { useFlashCodes } from '@/lib/useFlashCodes';
import { Search, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export function LightCharacterInput({
    value,
    onChange,
    className = ""
}: {
    value: string;
    onChange: (val: string) => void;
    className?: string;
}) {
    const { codes, loading } = useFlashCodes();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter codes that match either the code or the character based on current input
    const searchTerm = value.toLowerCase();
    const filteredCodes = codes.filter(c =>
        c.code.toLowerCase().includes(searchTerm) ||
        c.character.toLowerCase().includes(searchTerm) ||
        `${c.code} ${c.character}`.toLowerCase().includes(searchTerm) ||
        `[${c.code}] ${c.character}`.toLowerCase().includes(searchTerm)
    );

    // Check if the current value exactly matches any known character or formatted string
    const exactMatch = codes.find(c =>
        c.character.toLowerCase() === value.toLowerCase() ||
        c.code === value ||
        `${c.code} ${c.character}` === value ||
        `[${c.code}] ${c.character}` === value
    );

    // If we have an exact match and the value starts with the code, 
    // we only show the character part in the input box, so the blue badge doesn't overlap text.
    let displayValue = value;
    if (exactMatch) {
        if (value.startsWith(`${exactMatch.code} `)) {
            displayValue = value.substring(exactMatch.code.length + 1);
        } else if (value.startsWith(`[${exactMatch.code}] `)) {
            displayValue = value.substring(exactMatch.code.length + 3);
        }
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative w-full flex items-center">
                {exactMatch && (
                    <div className="absolute left-2.5 px-1.5 py-0.5 pointer-events-none rounded bg-blue-100 text-blue-700 font-mono text-[10px] font-bold border border-blue-200 shadow-sm z-10 transition-all">
                        {exactMatch.code}
                    </div>
                )}
                <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => {
                        // If the user types, they are editing the "displayValue".
                        // If there was an exact match with a code prefix, and they edit it, we drop the prefix so they can search freely.
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className={clsx(
                        "w-full bg-app-bg border border-app-border rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-blue-500/50 transition-all text-app-text-primary placeholder:text-app-text-secondary/50",
                        exactMatch ? "pl-12" : "pl-3"
                    )}
                    placeholder="Typ karakter of flashcode (bv. 082)"
                />
            </div>

            {isOpen && !loading && (filteredCodes.length > 0 || value.length > 0) && (
                <div className="absolute top-full left-0 right-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {filteredCodes.map(c => (
                        <div
                            key={c.code}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center group transition-colors"
                            onClick={() => {
                                onChange(`${c.code} ${c.character}`);
                                setIsOpen(false);
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">
                                    {c.code}
                                </span>
                                <span className="text-xs font-bold text-gray-800">
                                    {c.character}
                                </span>
                            </div>
                        </div>
                    ))}
                    {filteredCodes.length === 0 && (
                        <div className="px-3 py-2 text-[10px] text-gray-400 italic">
                            Geen overeenkomende codes gevonden.
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
