import { GoogleSpreadsheet } from 'google-spreadsheet';
import { DeployedBuoy } from './data';

// Config
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // Reusing the key as per instructions

export async function getDeployedBuoys(): Promise<DeployedBuoy[]> {
    if (!SPREADSHEET_ID || !API_KEY) {
        console.warn("Google Sheets ID or API Key is missing");
        return [];
    }

    try {
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, { apiKey: API_KEY });
        await doc.loadInfo();

        // Assuming the first sheet contains the data
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        return rows
            .filter((row) => row.get('Boei Naam') || row.get('id')) // Filter out empty rows
            .map((row, index) => ({
                id: row.get('id') || `row-${index}`,
                name: row.get('Boei Naam') || 'Onbekend',
                status: 'OK',
                date: row.get('Datum') || '',
                buoyType: {
                    name: row.get('Boei Type') || '',
                    color: (row.get('Kleurboei') as "blue" | "red" | "yellow" | "green") || "yellow"
                },
                chain: {
                    type: (row.get('Ketting') as "Blauw" | "Geel" | "Zwart") || "Zwart",
                    length: '', // Not in sheet based on summary
                    thickness: '' // Not in sheet based on summary
                },
                sinker: {
                    weight: row.get('Steen') || '',
                    type: '' // Not in sheet based on summary
                },
                light: {
                    serialNumber: row.get('serienummer') || '',
                    type: row.get('Lamp') || '',
                    details: ''
                },
                topmark: row.get('Topteken') || '',
                shackles: '', // Not in sheet based on summary
                notes: row.get('Notitie') || '',
                location: {
                    lat: parseFloat(row.get('Latitude')) || 0,
                    lng: parseFloat(row.get('Longitude')) || 0
                }
            }));
    } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
        return [];
    }
}
