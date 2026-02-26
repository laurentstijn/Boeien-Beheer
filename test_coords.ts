import proj4 from 'proj4';

// Define Lambert 72 (EPSG:31370)
proj4.defs('EPSG:31370', '+proj=lcc +lat_1=51.16666723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.869,52.2978,-103.724,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs');

const x = 143171.72;
const y = 226052.47;

const result = proj4('EPSG:31370', 'EPSG:4326', [x, y]);
console.log('User format 1: 143171.72E; 226052.47N');
console.log(`Converted to WGS84: Lng ${result[0]}, Lat ${result[1]}`);

// User format 2: 51° 14’,367 N 004° 22’,682 E
// Format 3: X150647.427 Y214391.331
const result2 = proj4('EPSG:31370', 'EPSG:4326', [150647.427, 214391.331]);
console.log('User format 3: X150647.427  Y214391.331');
console.log(`Converted to WGS84: Lng ${result2[0]}, Lat ${result2[1]}`);

