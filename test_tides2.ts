fetch("https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeseriesValues&ts_id=0456094010&format=json&period=P7D")
.then(r => r.json())
.then(data => {
    const measurements = data[0].data;
    console.log(measurements.slice(0, 10));
});
