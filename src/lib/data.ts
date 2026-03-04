export type Component = {
    id: string;
    name: string;
    details?: string;
    serialNumber?: string;
};

export type DeployedBuoy = {
    id: string;
    name: string;
    date: string;
    status: string;
    buoyConfigId?: string;
    buoyType: { name: string; color: string };
    chain: { type: string; length: string; thickness: string };
    sinker: { weight: string; type: string };
    light: { serialNumber?: string; serial_number?: string; article_number?: string; type: string; details?: string };
    topmark: string;
    shackles: string;
    notes: string;
    location: { lat: number; lng: number };
    metadata?: any;
    tideRestriction?: "Laag water" | "Hoog water" | "Altijd";
    lastServiceDate?: string;
    nextServiceDue?: string;
    lightCharacter?: string;
    lastServiceNotes?: string;
    zone?: string;
};

export const deployedBuoys: DeployedBuoy[] = [
    {
        id: "1",
        date: "12-2-2026",
        name: "Z-Boei oosterweel",
        status: "OK",
        buoyType: { name: "JET 2000", color: "blue" },
        chain: { type: "Blauw", length: "25m", thickness: "25mm" },
        sinker: { weight: "0.2T", type: "vierkant" },
        light: { serialNumber: "SN-2024-003", type: "Sabik" },
        topmark: "spits (kunststof)",
        shackles: "D Sluiting",
        notes: "test 456",
        location: { lat: 51.23, lng: 4.41 },
    },
    {
        id: "2",
        date: "11-2-2026",
        name: "Groene-Boei oosterweel",
        status: "OK",
        buoyType: { name: "JFC MARINE 1250", color: "red" },
        chain: { type: "Blauw", length: "25m", thickness: "25mm" },
        sinker: { weight: "0.2T", type: "vierkant" },
        light: { serialNumber: "SN-2023-017", type: "Tideland" },
        topmark: "spits (kunststof)",
        shackles: "D Sluiting",
        notes: "zeeschelde",
        location: { lat: 51.235, lng: 4.415 },
    },
    {
        id: "3",
        date: "10-2-2026",
        name: "test boei",
        status: "OK",
        buoyType: { name: "JET 2000", color: "yellow" },
        chain: { type: "Geel", length: "25m", thickness: "20mm" },
        sinker: { weight: "0.2T", type: "vierkant" },
        light: { serialNumber: "SN-2024-005", type: "Carmanah" },
        topmark: "st-andrieskruis (kunststof)",
        shackles: "D Sluiting\nG Haak",
        notes: "test 123",
        location: { lat: 51.225, lng: 4.405 },
    },
];

export type InventoryItem = {
    id: string;
    category: "Ketting" | "Steen" | "Boei" | "Structuur" | "Topteken" | "Sluiting" | "Lamp" | "Opslag";
    name: string;
    stock: number;
    minStock: number;
    details: string;
    status: "OK" | "Low Stock" | "Out of Stock";
};

export const inventoryItems: InventoryItem[] = [
    // Kettingen (Updated based on user screenshot)
    { id: "k1", category: "Ketting", name: "Ketting Rood", stock: 33, minStock: 5, details: "15m, 25mm, Zonder draainagel", status: "OK" },
    { id: "k2", category: "Ketting", name: "Ketting Blauw", stock: 18, minStock: 5, details: "25m, 25mm, Met draainagel", status: "OK" },
    { id: "k3", category: "Ketting", name: "Ketting Geel", stock: 10, minStock: 5, details: "25m, 20mm, Met draainagel", status: "OK" },
    { id: "k4", category: "Ketting", name: "Ketting Wit", stock: 18, minStock: 5, details: "15m, 20mm, Met draainagel", status: "OK" },

    // Stenen (Updated based on user feedback)
    { id: "s1", category: "Steen", name: "4T Ovaal", stock: 3, minStock: 1, details: "Ovaal", status: "OK" },
    { id: "s2", category: "Steen", name: "3T Ovaal", stock: 9, minStock: 1, details: "Ovaal", status: "OK" },
    { id: "s3", category: "Steen", name: "1.5T Rond", stock: 5, minStock: 1, details: "Rond", status: "OK" },
    { id: "s4", category: "Steen", name: "1T Rond", stock: 0, minStock: 1, details: "Rond", status: "Out of Stock" },
    { id: "s5", category: "Steen", name: "1.5T Plat", stock: 3, minStock: 1, details: "Plat", status: "OK" },
    { id: "s6", category: "Steen", name: "0.2T Vierkant", stock: 2, minStock: 1, details: "Vierkant", status: "OK" },

    // Boeien (Restored complete list)
    // Boeien (Restored complete list)
    { id: "b1", category: "Boei", name: "JFC MARINE 1250 Rood", stock: 1, minStock: 1, details: "JFC|Rood|Complete", status: "OK" },
    { id: "b1_2", category: "Boei", name: "JFC MARINE 1250 Groen", stock: 0, minStock: 1, details: "JFC|Groen|Complete", status: "OK" },
    { id: "b1_3", category: "Boei", name: "JFC MARINE 1250 Geel", stock: 0, minStock: 1, details: "JFC|Geel|Complete", status: "OK" },

    { id: "b2", category: "Boei", name: "JFC MARINE 1500 Rood", stock: 2, minStock: 1, details: "JFC|Rood|Complete", status: "OK" },
    { id: "b3", category: "Boei", name: "JFC MARINE 1500 Groen", stock: 2, minStock: 1, details: "JFC|Groen|Complete", status: "OK" },
    { id: "b4", category: "Boei", name: "JFC MARINE 1500 Geel", stock: 0, minStock: 1, details: "JFC|Geel|Complete", status: "OK" },

    { id: "b5", category: "Boei", name: "SEALITE SLB 1500 Rood", stock: 1, minStock: 1, details: "SEALITE|Rood|Complete", status: "OK" },
    { id: "b5_2", category: "Boei", name: "SEALITE SLB 1500 Groen", stock: 0, minStock: 1, details: "SEALITE|Groen|Complete", status: "OK" },
    { id: "b5_3", category: "Boei", name: "SEALITE SLB 1500 Geel", stock: 0, minStock: 1, details: "SEALITE|Geel|Complete", status: "OK" },

    { id: "b6", category: "Boei", name: "Mobilis BC1241/BC1242 Geel", stock: 4, minStock: 1, details: "Mobilis|Geel|Complete", status: "OK" },
    { id: "b6_2", category: "Boei", name: "Mobilis BC1241/BC1242 Rood", stock: 0, minStock: 1, details: "Mobilis|Rood|Complete", status: "OK" },
    { id: "b6_3", category: "Boei", name: "Mobilis BC1241/BC1242 Groen", stock: 0, minStock: 1, details: "Mobilis|Groen|Complete", status: "OK" },

    { id: "b8", category: "Boei", name: "Mobilis AQ1500 Geel", stock: 5, minStock: 1, details: "Mobilis|Geel|Complete", status: "OK" },
    { id: "b8_2", category: "Boei", name: "Mobilis AQ1500 Rood", stock: 0, minStock: 1, details: "Mobilis|Rood|Complete", status: "OK" },
    { id: "b8_3", category: "Boei", name: "Mobilis AQ1500 Groen", stock: 0, minStock: 1, details: "Mobilis|Groen|Complete", status: "OK" },

    // Shared Reserve for Mobilis
    { id: "b9", category: "Boei", name: "Mobilis BC1241/BC1242 Geel Reserve", stock: 6, minStock: 1, details: "Mobilis BC1241/BC1242|Geel|Reserve|Drijflichaam", status: "OK" },
    { id: "b9_2", category: "Boei", name: "Mobilis AQ1500 Geel Reserve", stock: 6, minStock: 1, details: "Mobilis AQ1500|Geel|Reserve|Drijflichaam", status: "OK" },

    { id: "b10", category: "Boei", name: "JET 9000 Rood", stock: 1, minStock: 1, details: "JET 9000|Rood|Assembled", status: "OK" },
    { id: "b11", category: "Boei", name: "JET 9000 Zwart", stock: 1, minStock: 1, details: "JET 9000|Zwart|Assembled", status: "OK" },
    { id: "b12", category: "Boei", name: "JET 9000 Rood Reserve", stock: 6, minStock: 1, details: "JET 9000|Rood|Reserve|Drijflichaam", status: "OK" },

    { id: "b13", category: "Boei", name: "JET 2000 Rood", stock: 1, minStock: 1, details: "JET 2000|Rood|Assembled", status: "OK" },
    { id: "b14", category: "Boei", name: "JET 2000 Groen", stock: 6, minStock: 1, details: "JET 2000|Groen|Assembled", status: "OK" },
    { id: "b15", category: "Boei", name: "JET 2000 Blauw/Geel", stock: 2, minStock: 1, details: "JET 2000|Blauw/Geel|Assembled", status: "OK" },
    { id: "b16", category: "Boei", name: "JET 2000 Rood Reserve", stock: 4, minStock: 1, details: "JET 2000|Rood|Reserve|Drijflichaam", status: "OK" },
    { id: "b17", category: "Boei", name: "JET 2000 Groen Reserve", stock: 4, minStock: 1, details: "JET 2000|Groen|Reserve|Drijflichaam", status: "OK" },

    // Kardinale Boeien (JET 9000)
    { id: "b18", category: "Boei", name: "JET 9000 Noord", stock: 0, minStock: 0, details: "JET 9000|Noord|Assembled", status: "Out of Stock" },
    { id: "b19", category: "Boei", name: "JET 9000 Oost", stock: 0, minStock: 0, details: "JET 9000|Oost|Assembled", status: "Out of Stock" },
    { id: "b20", category: "Boei", name: "JET 9000 Zuid", stock: 0, minStock: 0, details: "JET 9000|Zuid|Assembled", status: "Out of Stock" },
    { id: "b21", category: "Boei", name: "JET 9000 West", stock: 0, minStock: 0, details: "JET 9000|West|Assembled", status: "Out of Stock" },

    // Kardinale Boeien (JET 2000)
    { id: "b22", category: "Boei", name: "JET 2000 Noord", stock: 0, minStock: 0, details: "JET 2000|Noord|Assembled", status: "Out of Stock" },
    { id: "b23", category: "Boei", name: "JET 2000 Oost", stock: 0, minStock: 0, details: "JET 2000|Oost|Assembled", status: "Out of Stock" },
    { id: "b24", category: "Boei", name: "JET 2000 Zuid", stock: 0, minStock: 0, details: "JET 2000|Zuid|Assembled", status: "Out of Stock" },
    { id: "b25", category: "Boei", name: "JET 2000 West", stock: 0, minStock: 0, details: "JET 2000|West|Assembled", status: "Out of Stock" },

    // Lampen
    { id: "l1", category: "Lamp", name: "Sabik LED 350", stock: 2, minStock: 5, details: "Solar powered", status: "Low Stock" },
    { id: "l2", category: "Lamp", name: "Carmanah M650", stock: 5, minStock: 2, details: "Self-contained", status: "OK" },

    // Sluitingen
    { id: "sl1", category: "Sluiting", name: "D-Sluiting 25mm", stock: 500, minStock: 100, details: "Gegalvaniseerd", status: "OK" },
    { id: "sl2", category: "Sluiting", name: "G-Haak", stock: 80, minStock: 20, details: "-", status: "OK" },

    // Toptekens
    { id: "t1", category: "Topteken", name: "Spits (Geel)", stock: 15, minStock: 5, details: "Kunststof", status: "OK" },
    { id: "t2", category: "Topteken", name: "St. Andrieskruis", stock: 12, minStock: 5, details: "Kunststof", status: "OK" },

    // Structuren
    { id: "st1", category: "Structuur", name: "JET 9000", stock: 4, minStock: 1, details: "Gegalvaniseerd staal", status: "OK" },
    { id: "st2", category: "Structuur", name: "Mobilis BC1241/BC1242", stock: 1, minStock: 0, details: "Gegalvaniseerd staal", status: "OK" },
    { id: "st3", category: "Structuur", name: "JET 2000", stock: 0, minStock: 1, details: "Gegalvaniseerd staal", status: "Out of Stock" },
];
