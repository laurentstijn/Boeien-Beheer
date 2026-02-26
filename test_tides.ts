fetch("https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeSeriesList&station_no=04zes01a-1066&format=json")
.then(r => r.json())
.then(data => console.log(data.map(d => ({id: d.ts_id, name: d.ts_name}))));
