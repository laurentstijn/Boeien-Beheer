// src/lib/coordinates.ts
import proj4 from 'proj4';

// Define Lambert 72 (EPSG:31370)
proj4.defs('EPSG:31370', '+proj=lcc +lat_1=51.16666723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.869,52.2978,-103.724,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs');


/**
 * Coordinate formats:
 * DD: Decimal Degrees (e.g., 51.22100)
 * DMM: Degrees Decimal Minutes (e.g., 51° 13.260' N)
 * DMS: Degrees Minutes Seconds (e.g., 51° 13' 15.6" N)
 */

export interface ParsedCoordinate {
    decimal: number;
    error?: string;
}

/**
 * Extracts numbers from a coordinate string and attempts to parse it into Decimal Degrees.
 * Assumes North/East are positive, South/West are negative.
 */
export function parseCoordinate(input: string, isLongitude: boolean): ParsedCoordinate {
    const trimmed = input.trim();
    if (!trimmed) return { decimal: 0, error: 'Leeg veld' };

    // Common indicators for negative values
    const upperInput = trimmed.toUpperCase();
    let sign = 1;
    if (upperInput.includes('S') || upperInput.includes('W') || upperInput.startsWith('-')) {
        sign = -1;
    }

    // Replace commas with dots if they act as decimal separators, 
    // e.g., 14,367 -> 14.367
    let normalized = trimmed.replace(/,(\d+)/g, ".$1");

    // Extract all numbers (including decimals)
    const matches = normalized.match(/\d+(\.\d+)?/g);

    if (!matches || matches.length === 0) {
        return { decimal: 0, error: 'Geen getallen gevonden' };
    }

    const numbers = matches.map(Number);
    let decimal = 0;

    if (numbers.length === 1) {
        // DD format
        decimal = numbers[0];
        // If the original input didn't start with '-' but 'S'/'W' was present, apply sign
        if (sign === -1 && decimal > 0 && !trimmed.startsWith('-')) {
            decimal *= -1;
        } else if (trimmed.startsWith('-')) {
            // The regex already drops the minus sign, so apply it manually
            decimal = -numbers[0];
        }
    } else if (numbers.length === 2) {
        // DMM format (Degrees, Decimal Minutes)
        const degrees = numbers[0];
        const minutes = numbers[1];
        decimal = degrees + (minutes / 60);
        decimal *= sign;
    } else if (numbers.length >= 3) {
        // DMS format (Degrees, Minutes, Seconds)
        const degrees = numbers[0];
        const minutes = numbers[1];
        const seconds = numbers[2];
        decimal = degrees + (minutes / 60) + (seconds / 3600);
        decimal *= sign;
    } else {
        return { decimal: 0, error: 'Ongeldig formaat' };
    }

    // Basic validation
    if (isLongitude && (decimal < -180 || decimal > 180)) {
        return { decimal, error: 'Longitude moet tussen -180 en 180 liggen' };
    }
    if (!isLongitude && (decimal < -90 || decimal > 90)) {
        return { decimal, error: 'Latitude moet tussen -90 en 90 liggen' };
    }

    return { decimal };
}

/**
 * Formats a decimal degree into DD format (e.g., 51.22100)
 */
export function formatDD(decimal: number): string {
    return isNaN(decimal) ? '' : decimal.toFixed(5);
}

/**
 * Formats a decimal degree into DMM format (e.g., 51° 13.260' N)
 */
export function formatDMM(decimal: number, isLongitude: boolean): string {
    if (isNaN(decimal)) return '';

    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutes = (absolute - degrees) * 60;

    let direction = '';
    if (isLongitude) direction = decimal >= 0 ? 'E' : 'W';
    else direction = decimal >= 0 ? 'N' : 'S';

    return `${degrees}° ${minutes.toFixed(3)}' ${direction}`;
}

/**
 * Formats a decimal degree into DMS format (e.g., 51° 13' 15.6" N)
 */
export function formatDMS(decimal: number, isLongitude: boolean): string {
    if (isNaN(decimal)) return '';

    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;

    let direction = '';
    if (isLongitude) direction = decimal >= 0 ? 'E' : 'W';
    else direction = decimal >= 0 ? 'N' : 'S';

    return `${degrees}° ${minutes}' ${seconds.toFixed(1)}" ${direction}`;
}

export interface SmartPasteResult {
    lat: number | null;
    lng: number | null;
    formatDetected: string;
    error?: string;
}

/**
 * Tries to parse a full string containing both Latitude and Longitude or Lambert 72 X/Y coordinates.
 */
export function parseSmartInput(input: string): SmartPasteResult {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return { lat: null, lng: null, formatDetected: '', error: 'Leeg veld' };

    // 1. Check for Lambert 72 (X and Y coordinates)
    // Matches like "X150647.427 Y214391.331" or "143171.72E; 226052.47N"
    let normalized = trimmed.replace(/,(\d+)/g, ".$1"); // Normalize commas
    const allNumbers = normalized.match(/\d+(\.\d+)?/g)?.map(Number) || [];

    if (allNumbers.length === 2 && allNumbers[0] > 10000 && allNumbers[1] > 10000) {
        // Assume Lambert 72
        let x = allNumbers[0];
        let y = allNumbers[1];

        // Sometimes formatting is Y X. Try to detect by N/E suffixes.
        if (trimmed.includes('N') && trimmed.includes('E')) {
            const eIndex = trimmed.indexOf('E');
            const nIndex = trimmed.indexOf('N');
            if (nIndex < eIndex && allNumbers[0] === y) {
                x = allNumbers[1];
                y = allNumbers[0];
            }
        }

        const wgs84 = proj4('EPSG:31370', 'EPSG:4326', [x, y]);
        return {
            lat: wgs84[1],
            lng: wgs84[0],
            formatDetected: 'Lambert 72 (België)'
        };
    }

    // 2. Attempt to parse as Lat/Lng pair
    // Formatting like "51° 14’,367 N 004° 22’,682 E"
    // Normalize commas to dots here as well so we can search for them without confusion
    let normalizedForSplit = trimmed.replace(/,(\d+)/g, ".$1");
    let latStr = '';
    let lngStr = '';

    const latIndicators = ['N', 'S'];

    let splitIndex = -1;
    for (const latInd of latIndicators) {
        // We find the LAST index of the lat indicator in case the user typed N twice.
        // E.g. "51 N 004 E" -> we want the split right after 'N'.
        const idx = normalizedForSplit.indexOf(latInd);
        if (idx !== -1 && idx > splitIndex) splitIndex = idx;
    }

    if (splitIndex !== -1 && splitIndex < normalizedForSplit.length - 1) {
        latStr = normalizedForSplit.substring(0, splitIndex + 1);
        lngStr = normalizedForSplit.substring(splitIndex + 1);
    } else {
        // Fallback split
        if (allNumbers.length >= 2) {
            const midPoint = Math.floor(normalizedForSplit.length / 2);
            latStr = normalizedForSplit.substring(0, midPoint);
            lngStr = normalizedForSplit.substring(midPoint);
        } else {
            return { lat: null, lng: null, formatDetected: '', error: 'Kan coördinaten niet splitsen' };
        }
    }

    const latParsed = parseCoordinate(latStr, false);
    const lngParsed = parseCoordinate(lngStr, true);

    if (latParsed.error || lngParsed.error) {
        return { lat: null, lng: null, formatDetected: '', error: 'Fout bij het parsen van Lat/Lng uit de tekst' };
    }

    return {
        lat: latParsed.decimal,
        lng: lngParsed.decimal,
        formatDetected: 'WGS84 (Lat/Lng)'
    };
}
