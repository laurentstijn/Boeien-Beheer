import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface FlashCode {
    code: string;
    character: string;
}

const DEFAULT_CODES: FlashCode[] = [
    { code: '082', character: 'ISO 8s' }
];

export function useFlashCodes() {
    const [codes, setCodes] = useState<FlashCode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.storage.from('manuals').download('config/flash_codes.json').then(({ data, error }) => {
            if (data) {
                data.text().then(text => {
                    try {
                        setCodes(JSON.parse(text));
                    } catch (e) {
                        setCodes(DEFAULT_CODES);
                    }
                    setLoading(false);
                });
            } else {
                setCodes(DEFAULT_CODES);
                setLoading(false);
            }
        });
    }, []);

    const saveCodes = async (newCodes: FlashCode[]) => {
        setCodes(newCodes);
        const blob = new Blob([JSON.stringify(newCodes)], { type: 'application/json' });
        await supabase.storage.from('manuals').upload('config/flash_codes.json', blob, { upsert: true });
    };

    const addCode = (code: string, character: string) => {
        const newCodes = [...codes.filter(c => c.code !== code), { code, character }];
        saveCodes(newCodes);
    };

    const removeCode = (code: string) => {
        const newCodes = codes.filter(c => c.code !== code);
        saveCodes(newCodes);
    };

    return { codes, addCode, removeCode, loading };
}
