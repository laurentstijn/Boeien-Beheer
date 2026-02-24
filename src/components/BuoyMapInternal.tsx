"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DeployedBuoy } from "@/lib/data";
import L from "leaflet";
import clsx from "clsx";
import { useEffect, useCallback, useState } from "react";

// Helper to center map when selection changes
// Helper to handle map effects (load, center, reset)
function MapController({ selectedBuoyId, buoys }: { selectedBuoyId: string | null, buoys: DeployedBuoy[] }) {
    const map = useMap();

    // Store bounds in ref to use for reset
    const getBounds = useCallback(() => {
        if (buoys.length === 0) return null;
        return L.latLngBounds(buoys.map(b => [b.location.lat, b.location.lng]));
    }, [buoys]);

    // Initial fit bounds
    useEffect(() => {
        const bounds = getBounds();
        if (bounds && !selectedBuoyId) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [map, getBounds, selectedBuoyId]);

    // Center on selection
    useEffect(() => {
        if (selectedBuoyId) {
            const buoy = buoys.find(b => b.id === selectedBuoyId);
            if (buoy) {
                map.setView([buoy.location.lat, buoy.location.lng], 16, { animate: true });
            }
        }
    }, [selectedBuoyId, buoys, map]);

    return null;
}

// Control to reset zoom
function ResetZoomControl({ buoys }: { buoys: DeployedBuoy[] }) {
    const map = useMap();

    const handleReset = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (buoys.length > 0) {
            const bounds = L.latLngBounds(buoys.map(b => [b.location.lat, b.location.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
            map.setView([51.2194, 4.4025], 13);
        }
    }, [map, buoys]);

    return (
        <button
            onClick={handleReset}
            className="absolute top-[80px] left-3 bg-white hover:bg-gray-50 border-2 border-[rgba(0,0,0,0.2)] bg-clip-padding text-black p-1.5 rounded-sm shadow-sm z-[1000] cursor-pointer"
            title="Reset Zoom (Toon Alles)"
            style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.76 9.76 0 0 0-8.8 5" />
                <path d="M3 7v5h5" />
            </svg>
        </button>
    );
}

const hexForColor = (c: string) => {
    if (c.includes('groen') || c.includes('green')) return '#22C55E';
    if (c.includes('rood') || c.includes('red')) return '#EF4444';
    if (c.includes('geel') || c.includes('yellow')) return '#FACC15';
    if (c.includes('blauw') || c.includes('blue')) return '#3B82F6';
    if (c.includes('zwart') || c.includes('black')) return '#111827';
    if (c.includes('wit') || c.includes('white')) return '#F1F5F9';
    return '#9CA3AF';
};

// Vertically split circle (left/right) – for mixed-color buoys
const splitVertSvg = (left: string, right: string) => `
    <svg viewBox="0 0 24 24" width="28" height="28" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <circle cx="12" cy="12" r="10" fill="${left}"/>
        <path d="M12,2 A10,10 0 0,1 12,22 Z" fill="${right}"/>
        <circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="1.5"/>
    </svg>`;

// Horizontally split circle (top/bottom) – for cardinal buoys
const splitHorizSvg = (top: string, bottom: string) => `
    <svg viewBox="0 0 24 24" width="28" height="28" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <circle cx="12" cy="12" r="10" fill="${top}"/>
        <path d="M2,12 A10,10 0 0,0 22,12 Z" fill="${bottom}"/>
        <circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="1.5"/>
    </svg>`;

// 3-band circle (top / middle / bottom) for Oost & West cardinals
const threeBandSvg = (outer: string, middle: string) => `
    <svg viewBox="0 0 24 24" width="28" height="28" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <circle cx="12" cy="12" r="10" fill="${outer}"/>
        <path d="M3.5,8.5 A10,10 0 0,1 20.5,8.5 L20.5,15.5 A10,10 0 0,1 3.5,15.5 Z" fill="${middle}"/>
        <circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="1.5"/>
    </svg>`;

const getBuoyIcon = (buoy: DeployedBuoy, isSelected: boolean, isOverdue: boolean) => {
    const colorLower = (buoy.buoyType?.color || '').toLowerCase();
    const typeLower = (buoy.buoyType?.name || '').toLowerCase();
    const soort = ((buoy as any).metadata?.boei_soort || '').toLowerCase();

    const isCardinal = soort.includes('cardinaal') || typeLower.includes('cardinaal');
    const isStarboard = soort === 'spits' || (!isCardinal && (colorLower.includes('groen') || typeLower.includes('spits') || typeLower.includes('stuurboord')));
    const isPort = soort === 'plat' || (!isCardinal && (colorLower.includes('rood') || typeLower.includes('plat') || typeLower.includes('bakboord')));
    const isMixed = !isCardinal && (colorLower && (colorLower.includes('-') || colorLower.includes('/')));

    // Determine SVG
    let finalSvg = '';

    if (isCardinal) {
        const BLACK = '#111827', YELLOW = '#FACC15';
        if (soort.includes('noord')) finalSvg = splitHorizSvg(BLACK, YELLOW);        // Noord: zwart boven, geel onder
        else if (soort.includes('zuid')) finalSvg = splitHorizSvg(YELLOW, BLACK);    // Zuid: geel boven, zwart onder
        else if (soort.includes('oost')) finalSvg = threeBandSvg(BLACK, YELLOW);     // Oost: zwart-geel-zwart
        else if (soort.includes('west')) finalSvg = threeBandSvg(YELLOW, BLACK);     // West: geel-zwart-geel
        else finalSvg = splitHorizSvg(BLACK, YELLOW);                               // Generic cardinal
    } else if (isMixed) {
        const separator = colorLower.includes('-') ? '-' : '/';
        const parts = colorLower.split(separator);
        const c1 = hexForColor(parts[0] || '');
        const c2 = hexForColor(parts[1] || '');
        finalSvg = splitVertSvg(c1, c2);
    } else if (isStarboard) {
        const hexColor = '#22C55E';
        finalSvg = `<svg viewBox="0 0 24 24" width="28" height="28" style="fill:${hexColor};stroke:white;stroke-width:1.5;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><path d="M12 2L2 20h20Z"/></svg>`;
    } else if (isPort) {
        const hexColor = '#EF4444';
        finalSvg = `<svg viewBox="0 0 24 24" width="28" height="28" style="fill:${hexColor};stroke:white;stroke-width:1.5;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><rect x="3" y="4" width="18" height="16" rx="2"/></svg>`;
    } else {
        const hexColor = hexForColor(colorLower) || '#9CA3AF';
        finalSvg = `<svg viewBox="0 0 24 24" width="28" height="28" style="fill:${hexColor};stroke:white;stroke-width:1.5;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><circle cx="12" cy="12" r="10"/></svg>`;
    }

    return L.divIcon({
        className: 'custom-buoy-icon',
        html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;${isSelected ? 'transform:scale(1.3);z-index:1000;' : 'z-index:500;'}">
                ${isOverdue ? '<div class="absolute inset-0 rounded-full bg-red-500/40 animate-ping"></div>' : ''}
                ${finalSvg}
                ${isOverdue ? '<div style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:#dc2626;border:2px solid white;border-radius:9999px;"></div>' : ''}
                ${isSelected ? '<div class="absolute -bottom-2 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>' : ''}
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });

};



export default function BuoyMapInternal({
    buoys,
    selectedBuoyId,
    onSelect
}: {
    buoys: DeployedBuoy[],
    selectedBuoyId?: string | null,
    onSelect?: (id: string | null) => void
}) {


    // Center is handled by MapController now, but initial center needed for MapContainer
    // We use the full list for initial center to avoid jumping around if list is empty
    const center: [number, number] = buoys.length > 0
        ? [buoys[0].location.lat, buoys[0].location.lng]
        : [51.2194, 4.4025];

    return (
        <div className="h-full w-full rounded-lg overflow-hidden relative z-0">
            <MapContainer center={center} zoom={13} scrollWheelZoom={true} className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                <MapController selectedBuoyId={selectedBuoyId || null} buoys={buoys} />
                <ResetZoomControl buoys={buoys} />

                {buoys.map((buoy) => {
                    // Map markers flash if status is not OK, OR if the service date is strictly in the past (overtime)
                    const isOverdue = buoy.status === 'Niet OK' || buoy.status === 'Maintenance' || buoy.status === 'Aandacht' ||
                        (buoy.nextServiceDue ? new Date(buoy.nextServiceDue) < new Date() : false);
                    return (
                        <Marker
                            key={buoy.id}
                            position={[buoy.location.lat, buoy.location.lng]}
                            icon={getBuoyIcon(buoy, selectedBuoyId === buoy.id, isOverdue)}
                            eventHandlers={{
                                click: () => onSelect?.(buoy.id)
                            }}
                        >
                            <Popup>
                                <div className="p-2 min-w-[180px] max-w-[240px]">
                                    <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-2">
                                        <div className={clsx("w-3 h-3 rounded-full shadow-sm border border-black/10", {
                                            "bg-red-500": (buoy.buoyType?.color || "").toLowerCase().includes("rood") || (buoy.buoyType?.color || "").toLowerCase().includes("red"),
                                            "bg-green-500": (buoy.buoyType?.color || "").toLowerCase().includes("groen") || (buoy.buoyType?.color || "").toLowerCase().includes("green"),
                                            "bg-yellow-500": (buoy.buoyType?.color || "").toLowerCase().includes("geel") || (buoy.buoyType?.color || "").toLowerCase().includes("yellow"),
                                            "bg-blue-500": (buoy.buoyType?.color || "").toLowerCase().includes("blauw") || (buoy.buoyType?.color || "").toLowerCase().includes("blue"),
                                            "bg-gray-800": (buoy.buoyType?.color || "").toLowerCase().includes("zwart") || (buoy.buoyType?.color || "").toLowerCase().includes("black"),
                                        })} />
                                        <span className="text-sm font-bold text-gray-900">{buoy.name}</span>
                                        {isOverdue && (
                                            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 animate-pulse">
                                                NIET OK
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">Configuratie</p>
                                            <p className="text-[11px] text-gray-700 font-medium m-0">{buoy.buoyType?.name || 'Onbekend'} ({buoy.buoyType?.color})</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">Laatst</p>
                                                <p className="text-[11px] text-gray-700 font-medium m-0">
                                                    {buoy.lastServiceDate ? new Date(buoy.lastServiceDate).toLocaleDateString('nl-BE') : 'Geen'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">Volgende</p>
                                                <p className={clsx("text-[11px] font-bold m-0", isOverdue ? "text-red-600" : "text-green-600")}>
                                                    {buoy.nextServiceDue ? new Date(buoy.nextServiceDue).toLocaleDateString('nl-BE') : 'Geen'}
                                                </p>
                                            </div>
                                        </div>

                                        {buoy.metadata?.external_customer && (
                                            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                                <p className="text-[9px] uppercase font-black text-blue-500 mb-0.5">Externe Klant</p>
                                                <p className="text-[11px] font-bold text-blue-900 m-0">{buoy.metadata.customer_name || 'Onbekend'}</p>
                                            </div>
                                        )}

                                        <div className="pt-2 border-t border-gray-100">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 tracking-wider">Onderdelen</p>
                                            <div className="space-y-2.5">
                                                {/* Lamp */}
                                                {(buoy.light?.type || buoy.light?.serialNumber) && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-[11px] shrink-0">🔦</span>
                                                        <div className="min-w-0">
                                                            <div className="text-[11px] text-gray-800 leading-tight">
                                                                {buoy.light?.serialNumber && <span className="text-blue-600 font-bold font-mono mr-1.5">{buoy.light.serialNumber}</span>}
                                                                <span className="font-medium text-gray-500">{buoy.light?.type}</span>
                                                            </div>
                                                            {buoy.lightCharacter && (
                                                                <div className="text-[10px] text-blue-600 font-bold uppercase mt-0.5">
                                                                    Flash: {buoy.lightCharacter}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Ketting */}
                                                {buoy.chain?.type && (
                                                    <div className="flex items-start gap-2">
                                                        <div className="shrink-0 mt-0.5">
                                                            <div className={clsx("w-2.5 h-2.5 rounded-full", {
                                                                "bg-blue-500": buoy.chain.type?.toLowerCase().includes('blauw'),
                                                                "bg-red-500": buoy.chain.type?.toLowerCase().includes('rood'),
                                                                "bg-yellow-400": buoy.chain.type?.toLowerCase().includes('geel'),
                                                                "bg-white border border-gray-200": buoy.chain.type?.toLowerCase().includes('wit'),
                                                                "bg-green-500": buoy.chain.type?.toLowerCase().includes('groen'),
                                                                "bg-gray-800": buoy.chain.type?.toLowerCase().includes('zwart'),
                                                            })} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[11px] font-medium text-gray-700 leading-tight">
                                                                {buoy.chain.type?.replace(/^Ketting\s+/i, '')}
                                                            </div>
                                                            {(() => {
                                                                const length = buoy.chain?.length || (buoy as any).metadata?.chain?.lengte || (buoy as any).metadata?.chain?.length;
                                                                const thickness = buoy.chain?.thickness || (buoy as any).metadata?.chain?.dikte || (buoy as any).metadata?.chain?.thickness;
                                                                if (!length && !thickness) return null;
                                                                return (
                                                                    <div className="text-[10px] text-gray-400">
                                                                        {length && `${length}${String(length).toLowerCase().includes('m') ? '' : 'm'}`}
                                                                        {length && thickness && ' | '}
                                                                        {thickness && `${thickness}${String(thickness).toLowerCase().includes('mm') ? '' : 'mm'}`}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Steen */}
                                                {buoy.sinker?.type && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-[11px] shrink-0">⚓</span>
                                                        <div className="min-w-0">
                                                            <div className="text-[11px] font-medium text-gray-700 leading-tight">
                                                                {buoy.sinker.type}
                                                            </div>
                                                            {(() => {
                                                                const weight = buoy.sinker?.weight || (buoy as any).metadata?.sinker?.gewicht || (buoy as any).metadata?.sinker?.weight;
                                                                if (!weight) return null;
                                                                return (
                                                                    <div className="text-[10px] text-gray-400">
                                                                        Gewicht: {weight}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {buoy.lastServiceNotes && (
                                            <div className="pt-2 border-t border-gray-100">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Laatste vindingen</p>
                                                <p className="text-[10px] text-blue-700 italic m-0 leading-tight">
                                                    "{buoy.lastServiceNotes}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelect?.(buoy.id);
                                        }}
                                        className="mt-3 w-full text-[10px] font-bold bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded transition-all shadow-sm"
                                    >
                                        BEKIJK IN LIJST
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-800 text-[10px] font-bold px-2 py-1 rounded-full z-[1000] shadow-sm">
                {buoys.length} BOEIEN
            </div>
        </div>
    );
}
