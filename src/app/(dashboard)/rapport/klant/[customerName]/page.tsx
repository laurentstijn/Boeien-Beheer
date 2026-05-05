import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';
import PrintButton from '../../PrintButton';

export const dynamic = 'force-dynamic';

async function getCustomerReport(customerName: string) {
    console.log('Fetching customer report for:', customerName);

    // Find all buoys belonging to this customer
    const { data: buoysData, error: buoysError } = await supabaseAdmin
        .from('deployed_buoys')
        .select(`*, buoy_configurations (name)`)
        .filter('metadata->>customer_name', 'eq', customerName);

    if (buoysError) {
        console.error('Error fetching buoys for customer:', buoysError);
        return null;
    }

    if (!buoysData || buoysData.length === 0) return { customerName, buoys: [], rawBuoys: [] };

    // Fetch maintenance logs for these buoys
    const buoyIds = buoysData.map(b => b.id);
    const { data: logsData, error: logsError } = await supabaseAdmin
        .from('maintenance_logs')
        .select('*')
        .in('deployed_buoy_id', buoyIds)
        .order('service_date', { ascending: true });

    if (logsError) {
        console.error('Error fetching maintenance logs:', logsError);
    }

    const buoysWithLogs = buoysData.map(buoy => {
        const meta = buoy.metadata || {};
        return {
            id: buoy.id,
            name: buoy.name || 'Onbekend',
            deploymentDate: buoy.deployment_date as string | null,
            lastServiceDate: buoy.last_service_date as string | null,
            nextServiceDue: buoy.next_service_due as string | null,
            status: buoy.status as string,
            buoyType: (buoy as any).buoy_configurations?.name || meta.model || 'Onbekend',
            color: meta.color || '-',
            customerDeployDate: meta.customer_deploy_date || null,
            customerPickupDate: meta.customer_pickup_date || null,
            location: meta.location?.lat ? `${meta.location.lat.toFixed(5)}, ${meta.location.lng.toFixed(5)}` : (buoy.location ? buoy.location : '-'),
            logs: (logsData || []).filter(log => log.deployed_buoy_id === buoy.id)
        };
    });

    // Sort buoys by name
    buoysWithLogs.sort((a, b) => a.name.localeCompare(b.name));

    return {
        customerName,
        buoys: buoysWithLogs,
        rawBuoys: buoysData
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

export default async function KlantRapportPage({ params, searchParams }: {
    params: Promise<{ customerName: string }>,
    searchParams: Promise<{ embedded?: string, buoys?: string }>
}) {
    const p = await params;
    const customerName = decodeURIComponent(p.customerName);
    const { embedded, buoys } = await searchParams;
    const isEmbedded = embedded === 'true';

    const report = await getCustomerReport(customerName);
    if (!report) return notFound();

    if (buoys) {
        const buoyIds = buoys.split(',');
        report.buoys = report.buoys.filter(b => buoyIds.includes(b.id));
    }

    const today = fmt(new Date().toISOString());

    return (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", color: '#1a1a2e', background: 'white', minHeight: '100vh' }}>
            <style>{`
                @media print { 
                    @page { margin: 0; size: A4; }
                    .no-print { display: none !important; } 
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; } 
                    
                    /* PDF Layout Elements - Only for print */
                    .print-sidebar {
                        position: fixed;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        width: 38px;
                        background-color: #1a6d8d !important;
                        z-index: -10;
                    }

                    .print-header {
                        position: fixed;
                        top: 35px;
                        left: 80px;
                        z-index: 100;
                    }

                    .print-header img {
                        height: 50px;
                        object-fit: contain;
                    }

                    .print-footer-left {
                        position: fixed;
                        bottom: 25px;
                        left: 80px;
                        z-index: 100;
                    }

                    .print-footer-left img {
                        height: 40px;
                        object-fit: contain;
                    }

                    .print-footer-right {
                        position: fixed;
                        bottom: 35px;
                        right: 40px;
                        font-size: 8px;
                        font-weight: 700;
                        color: #000;
                        z-index: 100;
                    }
                }

                /* Content adjustments for print */
                @media print {
                    .rp-page-break { page-break-after: always; }
                    html, body, #wrapper, main {
                        height: auto !important;
                        overflow: visible !important;
                    }
                    .rp-container {
                        padding-top: 0 !important;
                        padding-right: 60px !important;
                        padding-bottom: 80px !important;
                        padding-left: 120px !important;
                        max-width: none !important;
                        margin: 0 !important;
                    }
                    .print-bg {
                        position: fixed !important;
                        top: 0;
                        left: 0;
                    }
                    .print-only-thead { display: table-header-group; }
                }

                @media screen {
                    .print-only-thead { display: none; }
                }

                .rp-container { max-width: 820px; margin: 0 auto; padding: 220px 60px 80px 120px; position: relative; z-index: 10; width: 100%; }
                .print-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 297mm;
                    z-index: 0;
                    pointer-events: none;
                    display: flex;
                    justify-content: center;
                    overflow: hidden;
                }
                
                .rp-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #2563eb; padding-bottom:18px; margin-bottom:32px; }
                .rp-logo { display:flex; align-items:center; gap:10px; }
                .rp-logo-icon { width:38px; height:38px; background:#2563eb; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; color: white;}
                .rp-title { font-size:22px; font-weight:800; color:#1e3a8a; margin:0; }
                .rp-sub { font-size:11px; color:#64748b; margin:3px 0 0; }
                .rp-meta { text-align:right; font-size:11px; color:#64748b; line-height:1.7; }
                
                .rp-buoy-section { margin-bottom: 40px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid; background: white; }
                .rp-buoy-header { background: #f8fafc; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
                .rp-buoy-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; display:flex; justify-content: space-between; align-items: center; }
                .rp-badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:9px; font-weight:700; text-transform:uppercase; margin-right:4px; }
                .rp-badge-blue { background:#dbeafe; color:#1d4ed8; }
                
                .rp-grid-4 { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; }
                .rp-fl { font-size:9px; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:2px; }
                .rp-fv { font-size:12px; font-weight:600; color:#1e293b; }
                
                .rp-timeline-table { w-full; border-collapse: collapse; font-size: 11px; width: 100%; background: white; }
                .rp-timeline-th { text-align: left; padding: 10px 16px; background: #f1f5f9; color: #475569; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
                .rp-timeline-td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
                .rp-timeline-tr:last-child .rp-timeline-td { border-bottom: none; }
                .rp-timeline-tr:hover { background: #f8fafc; }
                
                .rp-comp-replace { margin-top: 4px; padding: 6px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; font-size: 10px; }
                .rp-comp-label { font-weight: 700; color: #b45309; }
                .rp-text-red { color: #dc2626; }
                .rp-bold { font-weight: 700; }
                .rp-notes-inline { margin-top: 2px; font-style: italic; }
                .rp-muted { color: #64748b; font-style: italic; }

                .rp-footer { margin-top:40px; border-top:1px solid #e2e8f0; padding-top:14px; display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; }
                ${isEmbedded ? '.no-embedded { display: none !important; }' : ''}
            `}</style>

            <div style={{ position: 'relative', width: '100%', minHeight: '100%' }}>
                {/* Print Background via IMG tag */}
                <div className="print-bg">
                    <img 
                        src="/template_bg_hq.png" 
                        alt="Briefpapier" 
                        style={{
                            width: '210mm',
                            height: '297mm',
                            objectFit: 'cover',
                            maxWidth: 'none'
                        }} 
                    />
                </div>

                {!isEmbedded && <div className="no-print" style={{position: 'relative', zIndex: 10}}><PrintButton /></div>}

                <div className="rp-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                        <thead className="print-only-thead">
                            <tr><td style={{ height: '220px', padding: 0, border: 'none' }}></td></tr>
                        </thead>
                        <tbody>
                            <tr><td style={{ padding: 0, border: 'none' }}>
                                {/* Header */}
                                <div className="rp-header">
                                    <div className="rp-logo">
                                        <div className="rp-logo-icon">⚓</div>
                                        <div>
                                            <p className="rp-title">Klant Historiek Rapport</p>
                                            <p className="rp-sub">Specifiek overzicht voor: <span style={{ fontWeight: 800, color: '#1e293b' }}>{report.customerName}</span></p>
                                        </div>
                                    </div>
                                    <div className="rp-meta">
                                        <div>Rapportdatum: <strong>{today}</strong></div>
                                        <div style={{ marginTop: 4 }}>
                                            <span className="rp-badge rp-badge-blue">{report.buoys.length} Boeien</span>
                                        </div>
                                    </div>
                                </div>
                            </td></tr>

                        {report.buoys.length === 0 ? (
                            <tr><td style={{ padding: 0, border: 'none' }}>
                                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                                    Geen boeien gevonden voor deze klant.
                                </div>
                            </td></tr>
                        ) : (
                            report.buoys.map((buoy, index) => (
                                <tr key={buoy.id}><td style={{ padding: 0, border: 'none' }}>
                                    <div className="rp-buoy-section">
                                        <div className="rp-buoy-header">
                                            <h3 className="rp-buoy-title">
                                                <span>{buoy.name}</span>
                                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{buoy.buoyType}</span>
                                            </h3>
                                            <div className="rp-grid-4">
                                                <div><div className="rp-fl">Locatie</div><div className="rp-fv">{buoy.location}</div></div>
                                                <div><div className="rp-fl">Datum Uitleggen</div><div className="rp-fv">{fmt(buoy.customerDeployDate || buoy.deploymentDate)}</div></div>
                                                <div><div className="rp-fl">Datum Ophalen</div><div className="rp-fv">{fmt(buoy.customerPickupDate)}</div></div>
                                                <div><div className="rp-fl">Aantal Acties</div><div className="rp-fv">{buoy.logs.length + 1 + (buoy.customerPickupDate ? 1 : 0)}</div></div>
                                            </div>
                                        </div>

                                        <table className="rp-timeline-table">
                                            <thead>
                                                <tr>
                                                    <th className="rp-timeline-th" style={{ width: '15%' }}>Datum</th>
                                                    <th className="rp-timeline-th" style={{ width: '20%' }}>Technieker</th>
                                                    <th className="rp-timeline-th" style={{ width: '65%' }}>Actie & Details</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Initial Deployment Row */}
                                                <tr className="rp-timeline-tr">
                                                    <td className="rp-timeline-td rp-bold">{fmt(buoy.customerDeployDate || buoy.deploymentDate)}</td>
                                                    <td className="rp-timeline-td">-</td>
                                                    <td className="rp-timeline-td">
                                                        <strong>Initieel Uitgelegd</strong>
                                                        <div className="rp-muted" style={{ marginTop: '4px', marginBottom: '8px' }}>Boei werd geplaatst in deze huurperiode.</div>
                                                        {/* Components removed for cleaner layout */}
                                                    </td>
                                                </tr>

                                                {/* Maintenance Logs */}
                                    {buoy.logs.map(log => {
                                        const metadata = log.metadata || {};
                                        const replacedKeys = ['buoy', 'light', 'sinker', 'shackle', 'zinc', 'chain'].filter(k => metadata[k] || metadata[`${k}_lost`]);

                                        return (
                                            <tr key={log.id} className="rp-timeline-tr">
                                                <td className="rp-timeline-td rp-bold">{fmt(log.service_date)}</td>
                                                <td className="rp-timeline-td">{log.technician || 'Onbekend'}</td>
                                                <td className="rp-timeline-td">
                                                    {log.description ? (
                                                        <div style={{ marginBottom: '8px' }}>{log.description}</div>
                                                    ) : <div className="rp-muted" style={{ marginBottom: '8px' }}>Geen notities.</div>}

                                                    {(metadata.buoy_cleaned || metadata.light_tested) && (
                                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                            {metadata.buoy_cleaned && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>✓ Boei afgespoten</span>}
                                                            {metadata.light_tested && <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>✓ Lamp getest</span>}
                                                        </div>
                                                    )}

                                                    {/* Removed replaced component blocks */}
                                                </td>
                                            </tr>
                                        )
                                    })}

                                    {/* Final Retrieval Row */}
                                    {buoy.customerPickupDate && (
                                        <tr className="rp-timeline-tr">
                                            <td className="rp-timeline-td rp-bold">{fmt(buoy.customerPickupDate)}</td>
                                            <td className="rp-timeline-td">-</td>
                                            <td className="rp-timeline-td">
                                                <strong>Boei Binnengehaald</strong>
                                                <div className="rp-muted" style={{ marginTop: '4px' }}>Huurperiode beëindigd en boei is teruggehaald.</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                                </td></tr>
                            ))
                        )}
                        
                        <tr><td style={{ padding: 0, border: 'none' }}>
                            <div className="rp-footer hidden print:flex">
                                <span style={{ color: 'transparent' }}>_</span>
                            </div>
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        </div>
    );
}
