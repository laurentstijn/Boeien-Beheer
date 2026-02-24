import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';
import PrintButton from '../PrintButton';

export const dynamic = 'force-dynamic';

async function getBuoyReport(buoyId: string) {
    console.log('Fetching report for buoyId:', buoyId);
    const { data, error } = await supabaseAdmin
        .from('deployed_buoys')
        .select(`*, buoy_configurations (name)`)
        .eq('id', buoyId)
        .single();

    if (error) {
        console.error('Error fetching buoy report:', error);
        return null;
    }
    if (!data) return null;

    const meta = data.metadata || {};
    return {
        id: data.id,
        name: data.name || 'Onbekend',
        deploymentDate: data.deployment_date as string | null,
        lastServiceDate: data.last_service_date as string | null,
        nextServiceDue: data.next_service_due as string | null,
        lightCharacter: data.light_character as string | null,
        notes: data.notes as string | null,
        status: data.status as string,
        buoyType: (data as any).buoy_configurations?.name || meta.model || 'Onbekend',
        color: meta.color || '-',
        chain: meta.chain,
        sinker: meta.sinker,
        light: meta.light,
        isExternalCustomer: !!meta.external_customer,
        customerName: meta.customer_name || '-',
        customerDeployDate: meta.customer_deploy_date || null,
        customerPickupDate: meta.customer_pickup_date || null,
    };
}

function fmt(dateStr: string | null) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

export default async function RapportPage({ params, searchParams }: {
    params: Promise<{ buoyId: string }>,
    searchParams: Promise<{ embedded?: string }>
}) {
    const { buoyId } = await params;
    const { embedded } = await searchParams;
    const isEmbedded = embedded === 'true';

    const buoy = await getBuoyReport(buoyId);
    if (!buoy) return notFound();

    const today = fmt(new Date().toISOString());

    return (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", color: '#1a1a2e', background: 'white', minHeight: '100vh' }}>
            <style>{`
                @media print { .no-print { display: none !important; } body { background: white !important; } }
                .rp { max-width: 794px; margin: 0 auto; padding: 40px 48px; }
                .rp-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #2563eb; padding-bottom:18px; margin-bottom:24px; }
                .rp-logo { display:flex; align-items:center; gap:10px; }
                .rp-logo-icon { width:38px; height:38px; background:#2563eb; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; }
                .rp-title { font-size:22px; font-weight:800; color:#1e3a8a; margin:0; }
                .rp-sub { font-size:11px; color:#64748b; margin:3px 0 0; }
                .rp-meta { text-align:right; font-size:11px; color:#64748b; line-height:1.7; }
                .rp-badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:9px; font-weight:700; text-transform:uppercase; margin-right:4px; }
                .rp-badge-blue { background:#dbeafe; color:#1d4ed8; }
                .rp-badge-green { background:#dcfce7; color:#166534; }
                .rp-badge-orange { background:#fff7ed; color:#c2410c; }
                .rp-section { margin-bottom:22px; }
                .rp-section-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#2563eb; border-bottom:1px solid #e2e8f0; padding-bottom:5px; margin-bottom:12px; }
                .rp-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
                .rp-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
                .rp-fl { font-size:9px; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:2px; }
                .rp-fv { font-size:13px; font-weight:600; color:#1e293b; }
                .rp-cust { background:#eff6ff; border:1.5px solid #bfdbfe; border-radius:10px; padding:16px; margin-bottom:22px; }
                .rp-cust-title { font-size:12px; font-weight:800; color:#1d4ed8; margin-bottom:12px; }
                .rp-comp-row { display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding:7px 0; font-size:12px; }
                .rp-comp-row:last-child { border-bottom:none; }
                .rp-comp-label { color:#64748b; font-weight:600; }
                .rp-comp-value { color:#1e293b; font-weight:600; }
                .rp-notes { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:12px; color:#475569; line-height:1.6; min-height:52px; }
                .rp-sigs { display:flex; justify-content:space-between; margin-top:40px; }
                .rp-sig { border-top:1px solid #cbd5e1; width:180px; text-align:center; padding-top:8px; font-size:10px; color:#94a3b8; margin-top:24px; }
                .rp-footer { margin-top:32px; border-top:1px solid #e2e8f0; padding-top:14px; display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; }
                .rp-print-btn { position:fixed; top:20px; right:20px; background:#2563eb; color:white; border:none; padding:10px 22px; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(37,99,235,.35); z-index:999; }
                ${isEmbedded ? '.no-embedded { display: none !important; }' : ''}
            `}</style>

            {!isEmbedded && <PrintButton />}

            <div className="rp">
                {/* Header */}
                <div className="rp-header">
                    <div className="rp-logo">
                        <div className="rp-logo-icon">⚓</div>
                        <div>
                            <p className="rp-title">Boei Rapport</p>
                            <p className="rp-sub">Boeien Zeeschelde – automatisch gegenereerd</p>
                        </div>
                    </div>
                    <div className="rp-meta">
                        <div>Rapportdatum: <strong>{today}</strong></div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, marginTop: 2 }}>{buoy.id.slice(0, 8).toUpperCase()}</div>
                        <div style={{ marginTop: 4 }}>
                            <span className="rp-badge rp-badge-blue">{buoy.color}</span>
                            <span className={`rp-badge ${buoy.status === 'OK' ? 'rp-badge-green' : 'rp-badge-orange'}`}>{buoy.status}</span>
                        </div>
                    </div>
                </div>

                {/* External Customer box */}
                {buoy.isExternalCustomer && (
                    <div className="rp-cust">
                        <div className="rp-cust-title">🏢 Externe Klant</div>
                        <div className="rp-grid-3">
                            <div><div className="rp-fl">Klant / Bedrijf</div><div className="rp-fv">{buoy.customerName}</div></div>
                            <div><div className="rp-fl">Datum Uitgelegd</div><div className="rp-fv">{fmt(buoy.customerDeployDate)}</div></div>
                            <div><div className="rp-fl">Datum Opgehaald</div><div className="rp-fv">{fmt(buoy.customerPickupDate)}</div></div>
                        </div>
                    </div>
                )}

                {/* Buoy info */}
                <div className="rp-section">
                    <div className="rp-section-title">Boeigegevens</div>
                    <div className="rp-grid">
                        <div><div className="rp-fl">Naam</div><div className="rp-fv">{buoy.name}</div></div>
                        <div><div className="rp-fl">Model / Type</div><div className="rp-fv">{buoy.buoyType}</div></div>
                        <div><div className="rp-fl">Uitgelegd op</div><div className="rp-fv">{fmt(buoy.deploymentDate)}</div></div>
                        <div><div className="rp-fl">Licht Karakter</div><div className="rp-fv">{buoy.lightCharacter || '-'}</div></div>
                        <div><div className="rp-fl">Laatste Onderhoud</div><div className="rp-fv">{fmt(buoy.lastServiceDate)}</div></div>
                        <div><div className="rp-fl">Volgend Onderhoud</div><div className="rp-fv">{fmt(buoy.nextServiceDue)}</div></div>
                    </div>
                </div>

                {/* Components */}
                <div className="rp-section">
                    <div className="rp-section-title">Gekoppelde Onderdelen</div>
                    <div className="rp-comp-row">
                        <span className="rp-comp-label">Lamp</span>
                        <span className="rp-comp-value">
                            {buoy.light
                                ? `SN: ${buoy.light?.serialNumber || buoy.light?.serial_number || buoy.light?.article_number || '-'} — ${buoy.light.type || buoy.light.brand || ''}`
                                : 'Niet gekoppeld'}
                        </span>
                    </div>
                    <div className="rp-comp-row">
                        <span className="rp-comp-label">Ketting</span>
                        <span className="rp-comp-value">
                            {buoy.chain
                                ? `${buoy.chain.type || '-'}${buoy.chain.length ? `, ${buoy.chain.length}m` : ''}${buoy.chain.thickness ? `, ∅${buoy.chain.thickness}` : ''}`
                                : 'Niet gekoppeld'}
                        </span>
                    </div>
                    <div className="rp-comp-row">
                        <span className="rp-comp-label">Steen / Anker</span>
                        <span className="rp-comp-value">
                            {buoy.sinker
                                ? `${buoy.sinker.type || '-'}${buoy.sinker.weight ? ` — ${buoy.sinker.weight}` : ''}`
                                : 'Niet gekoppeld'}
                        </span>
                    </div>
                </div>

                {/* Notes */}
                <div className="rp-section">
                    <div className="rp-section-title">Notities</div>
                    <div className="rp-notes">{buoy.notes || 'Geen notities.'}</div>
                </div>

                {/* Signatures */}
                <div className="rp-sigs">
                    <div><div className="rp-sig">Opgemaakt door</div></div>
                    {buoy.isExternalCustomer && <div><div className="rp-sig">Handtekening klant</div></div>}
                    <div><div className="rp-sig">Goedkeuring</div></div>
                </div>

                <div className="rp-footer">
                    <span>Boei Beheer – Boeien Zeeschelde</span>
                    <span>{today}</span>
                </div>
            </div>
        </div>
    );
}
