import proj4 from 'proj4';

// Define Lambert 72 (EPSG:31370) -> standard for Belgian Lambert
proj4.defs('EPSG:31370', '+proj=lcc +lat_1=51.16666723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.869,52.2978,-103.724,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs');

const x1 = 143171.72;
const y1 = 226052.47;
const wgs84_1 = proj4('EPSG:31370', 'EPSG:4326', [x1, y1]);
console.log(`Test 1: [${x1}, ${y1}] -> Lng: ${wgs84_1[0]}, Lat: ${wgs84_1[1]}`);

const x2 = 150647.427;
const y2 = 214391.331;
const wgs84_2 = proj4('EPSG:31370', 'EPSG:4326', [x2, y2]);
console.log(`Test 2: [${x2}, ${y2}] -> Lng: ${wgs84_2[0]}, Lat: ${wgs84_2[1]}`);
