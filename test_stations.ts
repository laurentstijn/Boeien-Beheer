const STATIONS = [
    { id: "0456117010", stationNo: "04zes01a-1066", name: "Prosperpolder", lat: 51.3483272650923, lng: 4.23793225487478 },
    { id: "0454635010", stationNo: "04zes14a-1066", name: "Kallo", lat: 51.2679979571716, lng: 4.29852383884503 },
    { id: "0454018010", stationNo: "04zes21a-1066", name: "Antwerpen", lat: 51.227468146743, lng: 4.39991370684368 },
    { id: "0456055010", stationNo: "04BS-WIN-AFW-1095", name: "Rupelmonde", lat: 51.1359646843388, lng: 4.32230864155543 },
    { id: "0454067010", stationNo: "04BS-RUP-1095", name: "Boom", lat: 51.0868580992141, lng: 4.35368553727916 },
    { id: "0455522010", stationNo: "04zes36a-1066", name: "Temse", lat: 51.1228087597494, lng: 4.21867338754706 },
    { id: "04102372010", stationNo: "04zes39a-1066", name: "Driegoten", lat: 51.0925568254825, lng: 4.17099518412599 }
];

async function run() {
    for (const st of STATIONS) {
        try {
            const url = `https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeSeriesList&station_no=${st.stationNo}&format=json`;
            const res = await fetch(url);
            const data = await res.json();
            
            // Loop array to find Array where [4] === 'Astro.Pv.HW'
            let hwSeriesId = null;
            data.forEach((row: any) => {
                if(row[4] === 'Astro.Pv.HW') {
                    hwSeriesId = row[3];
                }
            });
            
            if (hwSeriesId) {
                console.log(`{ name: "${st.name}", astroHW_id: "${hwSeriesId}", lat: ${st.lat}, lng: ${st.lng} },`);
            } else {
                console.log(`${st.name}: NOT FOUND`);
            }
        } catch (e) {
            console.error(`Error ${st.name}`);
        }
    }
}
run();
