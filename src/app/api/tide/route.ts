import { NextResponse } from 'next/server';

const STATIONS = [
    { id: "0456117010", stationNo: "04zes01a-1066", name: "Prosperpolder", lat: 51.3483272650923, lng: 4.23793225487478, source: "waterinfo.be", datum: "TAW", unit: "m" },
    { id: "0454635010", stationNo: "04zes14a-1066", name: "Kallo", lat: 51.2679979571716, lng: 4.29852383884503, source: "waterinfo.be", datum: "TAW", unit: "m" },
    { id: "0454018010", stationNo: "04zes21a-1066", name: "Antwerpen", lat: 51.227468146743, lng: 4.39991370684368, source: "waterinfo.be", datum: "TAW", unit: "m" },
    { id: "0456055010", stationNo: "04BS-WIN-AFW-1095", name: "Rupelmonde", lat: 51.1359646843388, lng: 4.32230864155543, source: "waterinfo.be", datum: "TAW", unit: "m" },
    { id: "0454067010", stationNo: "04BS-RUP-1095", name: "Boom", lat: 51.0868580992141, lng: 4.35368553727916, source: "waterinfo.be", datum: "TAW", unit: "m" },
    { id: "0455522010", stationNo: "04zes36a-1066", name: "Temse", lat: 51.1228087597494, lng: 4.21867338754706, source: "waterinfo.be", datum: "TAW", unit: "m" },
    { id: "04102372010", stationNo: "04zes39a-1066", name: "Driegoten", lat: 51.0925568254825, lng: 4.17099518412599, source: "waterinfo.be", datum: "TAW", unit: "m" }
];

function generateWaterinfoEmbed(stationNo?: string) {
    if (!stationNo) return null;

    // Create a 2-day window centered around today to ensure the graph looks good
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDate = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${yyyy}-${mm}-${dd} 00:00:00`;
    };

    const fromDate = formatDate(yesterday);
    const toDate = formatDate(tomorrow);

    const configStr = `dataSource=mergedPortal&period=P1d&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&station_no=${stationNo}&glist=[{"filter":{"ts_name":"Pv","stationparameter_name":"W","ts_name_lowres":"Pv.HWLW","station_no":"${stationNo}"},"value_ts":{"ts_name":"Pv","stationparameter_name":"W"},"ext_ts_filter":{"ts_shortname":"Cmd.Alarm.Abs.O,Cmd.Waak.Abs.O,Cmd.Prewaak.Abs.O","stationparameter_name":"W","station_no":"${stationNo}"},"template":"hic_tidal"}]`;
    return `https://www.waterinfo.vlaanderen.be/filestore/apps/kisters/js/share/tsclient.html?${btoa(configStr)}`;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');

    try {
        const results = await Promise.all(STATIONS.map(async (station) => {
            try {
                if (station.source === 'waterinfo.be') {
                    // Fetch 60 mins to ensure we have multiple points for trend
                    const fetchUrl = `https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeseriesValues&ts_id=${station.id}&format=json&period=PT60M`;
                    const response = await fetch(fetchUrl, { next: { revalidate: 300 } });
                    if (response.ok) {
                        const data = await response.json();
                        const measurements = data[0]?.data || [];
                        if (measurements.length >= 2) {
                            const latestArr = measurements[measurements.length - 1];
                            const prevArr = measurements[measurements.length - 2];

                            return {
                                ...station,
                                currentLevel: latestArr[1],
                                timestamp: latestArr[0],
                                trend: latestArr[1] > prevArr[1] ? 'rising' : 'falling',
                                isSimulation: false,
                                fetchUrl,
                                embedUrl: generateWaterinfoEmbed(station.stationNo)
                            };
                        } else if (measurements.length === 1) {
                            const latestArr = measurements[0];
                            return {
                                ...station,
                                currentLevel: latestArr[1],
                                timestamp: latestArr[0],
                                trend: 'stable',
                                isSimulation: false,
                                fetchUrl,
                                embedUrl: generateWaterinfoEmbed(station.stationNo)
                            };
                        }
                    }

                    // If JSON was empty or missing for this specific 60 min window,
                    // return the fallback but WITH the official embed URL since that will
                    // still render correctly for the entire day.
                    return getFallbackForStation(station, generateWaterinfoEmbed(station.stationNo));
                }
                return getFallbackForStation(station);
            } catch (e) {
                console.warn(`Fetch failed for ${station.name}:`, e);
                return getFallbackForStation(station, station.source === 'waterinfo.be' ? generateWaterinfoEmbed(station.stationNo) : undefined);
            }
        }));

        // Find nearest station
        let nearestStation = null;
        if (!isNaN(lat) && !isNaN(lng)) {
            nearestStation = results.reduce((prev, curr) => {
                const prevDist = Math.sqrt(Math.pow(prev.lat - lat, 2) + Math.pow(prev.lng - lng, 2));
                const currDist = Math.sqrt(Math.pow(curr.lat - lat, 2) + Math.pow(curr.lng - lng, 2));
                return currDist < prevDist ? curr : prev;
            });
        }

        return NextResponse.json({
            stations: results,
            nearest: nearestStation,
            advice: nearestStation ? generateAdvice(nearestStation) : null
        });

    } catch (error) {
        console.error('Tide API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch tide data' }, { status: 500 });
    }
}

function generateAdvice(station: any) {
    const level = station.currentLevel;
    const isLow = station.unit === 'm' ? level < 1.0 : level < 100;
    const isHigh = station.unit === 'm' ? level >= 4.0 : level >= 400;

    return {
        isLowWindow: isLow,
        isHighWindow: isHigh,
        trend: station.trend,
        datum: station.datum,
        unit: station.unit,
        highWaterTimes: [], // Deprecated: live predictions should be viewed via the embedUrl chart
        lowWaterTimes: [] // Deprecated
    };
}

function getFallbackForStation(station: any, embedUrl?: string | null) {
    const now = new Date();

    // We cannot simulate accurate levels statically without a tide model
    return {
        ...station,
        currentLevel: 0,
        timestamp: now.toISOString(),
        isSimulation: true,
        trend: 'stable',
        embedUrl,
        fetchUrl: 'Gesimuleerde data (geen URLbeschikbaar)'
    };
}
