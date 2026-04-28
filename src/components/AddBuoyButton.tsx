'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AssetDialog } from './AssetDialog';

interface AddAssetButtonProps {
    itemTypes: any[];
    category?: string;
    label?: string;
    buoys?: any[];
}

export function AddAssetButton({ itemTypes, category = "Boei", label = "Nieuwe Boei", buoys = [] }: AddAssetButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
                <Plus className="w-5 h-5" />
                <span>{label}</span>
            </button>

            {isOpen && (
                <AssetDialog
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    mode="create"
                    itemTypes={itemTypes}
                    asset={{ category }}
                    buoys={buoys}
                />
            )}
        </>
    );
}

export function AddBuoyButton({ itemTypes, buoys = [] }: { itemTypes: any[], buoys?: any[] }) {
    return <AddAssetButton itemTypes={itemTypes} category="Boei" label="Nieuwe Boei" buoys={buoys} />;
}
