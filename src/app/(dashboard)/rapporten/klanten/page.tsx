import React from 'react';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import KlantenRapportenClient from './KlantenRapportenClient';

export const dynamic = 'force-dynamic';

export default async function KlantenRapportenPage() {
    // Fetch unique customers from deployed_buoys metadata
    const { data: buoys, error } = await supabaseAdmin
        .from('deployed_buoys')
        .select('metadata');

    if (error) {
        console.error('Error fetching buoys for customers list:', error);
    }

    const customersSet = new Set<string>();

    (buoys || []).forEach(b => {
        const meta = b.metadata || {};
        if (meta.external_customer && meta.customer_name) {
            customersSet.add(meta.customer_name);
        }
    });

    const customers = Array.from(customersSet).sort();

    return <KlantenRapportenClient customers={customers} />;
}
