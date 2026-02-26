import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching buoys...");
    const { data: allBuoys, error: buoysError } = await supabase
        .from('deployed_buoys')
        .select('*')
        .in('status', ['OK', 'Niet OK', 'Aandacht']);
        
    if (buoysError) { console.error("Buoys error:", buoysError); return; }
    
    console.log("Fetching planned entries...");
    const { data: plannedEntries, error: planError } = await supabase
        .from('planning_entries')
        .select('buoy_id')
        .gte('planned_date', new Date().toISOString().split('T')[0]);
        
    if (planError) { console.error("Plan error:", planError); return; }
    
    const plannedBuoyIds = new Set(plannedEntries.map(p => p.buoy_id));
    const today = new Date().toISOString().split('T')[0];
    
    const overdueHoogWaterBuoys = allBuoys.filter(b => 
        b.status !== 'Hidden' && 
        b.status !== 'Maintenance' && 
        b.tideRestriction === 'Hoog water' &&
        b.nextServiceDue && 
        b.nextServiceDue < today &&
        !plannedBuoyIds.has(b.id)
    );
    
    console.log(`Found ${overdueHoogWaterBuoys.length} overdue 'Hoog water' buoys not yet planned.`);
    for (const b of overdueHoogWaterBuoys) {
        console.log(`- ${b.name} (Due: ${b.nextServiceDue})`);
    }

    console.log("Fetching tide data...");
    const url = `https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeseriesValues&ts_id=04112717010&format=json&period=P14D`;
    const response = await fetch(url);
    const data = await response.json();
    const measurements = data[0]?.data || [];
    
    console.log(`Fetched ${measurements.length} tide measurements.`);
    
    const validWindows = [];
    for (const [timestampStr, level] of measurements) {
        const dateObj = new Date(timestampStr);
        const hour = dateObj.getHours();
        const min = dateObj.getMinutes();
        
        if (hour >= 11 && hour <= 16 && level >= 4.0) {
            validWindows.push({
                date: dateObj.toISOString().split('T')[0],
                time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
                level: level
            });
        }
    }
    
    console.log(`Found ${validWindows.length} valid tide windows between 11-16h.`);
    console.log(validWindows.slice(0, 5));
}
run();
