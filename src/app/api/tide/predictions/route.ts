import { NextResponse } from 'next/server';

const PREDICTION_STATIONS = [
    { id: "04112719010", stationNo: "04zes01a-1066", name: "Prosperpolder", lat: 51.3483272650923, lng: 4.23793225487478 },
    { id: "04113438010", stationNo: "04zes14a-1066", name: "Kallo", lat: 51.2679979571716, lng: 4.29852383884503 },
    { id: "04112709010", stationNo: "04zes21a-1066", name: "Antwerpen", lat: 51.227468146743, lng: 4.39991370684368 },
    { id: "04112714010", stationNo: "04BS-WIN-AFW-1095", name: "Rupelmonde", lat: 51.1359646843388, lng: 4.32230864155543 },
    { id: "04113403010", stationNo: "04BS-RUP-1095", name: "Boom", lat: 51.0868580992141, lng: 4.35368553727916 },
    { id: "04113493010", stationNo: "04zes36a-1066", name: "Temse", lat: 51.1228087597494, lng: 4.21867338754706 },
    { id: "04113413010", stationNo: "04zes39a-1066", name: "Driegoten", lat: 51.0925568254825, lng: 4.17099518412599 }
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const daysParam = parseInt(searchParams.get('days') || '14', 10);

    try {
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        const localeDateString = (d: Date) => {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const fromDateStr = localeDateString(targetDate) + 'T00:00:00';

        const toDate = new Date(targetDate);
        toDate.setDate(toDate.getDate() + daysParam);
        const toDateStr = localeDateString(toDate) + 'T23:59:59';

        const tsIds = PREDICTION_STATIONS.map(s => s.id).join(',');
        const fetchUrl = `https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeseriesValues&ts_id=${tsIds}&format=json&from=${fromDateStr}&to=${toDateStr}`;

        const response = await fetch(fetchUrl, { next: { revalidate: 3600 } });

        if (!response.ok) {
            throw new Error(`Waterinfo responded with ${response.status}`);
        }

        const data = await response.json();
        const results: Record<string, { highWaters: any[], lowWaters: any[] }> = {};

        // data is an array of timeseries
        data.forEach((series: any) => {
            const stationDef = PREDICTION_STATIONS.find(s => s.id === series.ts_id);
            if (!stationDef) return;

            const measurements = series.data || [];
            const highWaters: any[] = [];
            const lowWaters: any[] = [];

            measurements.forEach((m: any[]) => {
                const ts = m[0];
                const value = m[1];
                const d = new Date(ts);
                const localeDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                const pt = {
                    time: d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }),
                    // use YYYY-MM-DD for grouping
                    date: localeDateStr,
                    timestamp: ts,
                    level: value
                };

                if (value > 3.0) {
                    highWaters.push(pt);
                } else if (value < 2.0) {
                    lowWaters.push(pt);
                }
            });

            results[stationDef.name] = { highWaters, lowWaters };
        });

        // Add nearest-station helper for the client side
        return NextResponse.json({
            stations: PREDICTION_STATIONS,
            predictions: results
        });

    } catch (error) {
        console.error('Tide Prediction API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch tide prediction' }, { status: 500 });
    }
}
