import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const maxDuration = 60; // Allow 60s for external API calls

async function getFutureHighTides() {
    // KiWIS API to get astronomical tide predictions (Astro.HWLW) for Prosperpolder
    // ts_id 0456094010 is Astromical HWLW or Pv.HWLW, wait, we checked /api/tide/route.ts
    // Let's use 0456094010 (Pv.HWLW) or 04112719010 (Astro.Pv.HWLW)
    // Actually the Astro.HWLW timestamp is accurate for predictions. Let's use 04112701010 Astro.05 which is 5-min intervals
    // Better yet, just use Astro.Pv.HW (04112717010) it gives exact HW points.

    // Request HW predictions for the next 14 days
    const url = `https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeseriesValues&ts_id=04112717010&format=json&period=P14D`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch tide predictions");

    const data = await response.json();
    const measurements = data[0]?.data || [];

    const validWindows: { date: string, time: string, level: number }[] = [];

    for (const [timestampStr, level] of measurements) {
        // timestampStr is like "2026-02-26T15:20:00.000+01:00"
        const dateObj = new Date(timestampStr);
        const hour = dateObj.getHours();
        const min = dateObj.getMinutes();

        // We only care about HW between 11:00 and 16:00
        if (hour >= 11 && hour <= 16) {
            // Also ensure it's actually High Water (> 4.0m)
            if (level >= 4.0) {
                validWindows.push({
                    date: dateObj.toISOString().split('T')[0],
                    time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
                    level: level
                });
            }
        }
    }

    return validWindows;
}

export async function POST() {
    try {
        // 1. Fetch all 'Hoog water' buoys that are overdue and NOT yet planned
        const { data: allBuoys, error: buoysError } = await supabaseAdmin
            .from('deployed_buoys')
            .select('*')
            .in('status', ['OK', 'Niet OK', 'Aandacht']); // Exclude Hidden/Lost Maintained status logic handled in code

        if (buoysError) throw buoysError;

        const { data: plannedEntries, error: planError } = await supabaseAdmin
            .from('planning_entries')
            .select('buoy_id')
            .gte('planned_date', new Date().toISOString().split('T')[0]);

        if (planError) throw planError;

        const plannedBuoyIds = new Set(plannedEntries.map(p => p.buoy_id));

        const today = new Date().toISOString().split('T')[0];

        const overdueHoogWaterBuoys = allBuoys.filter(b =>
            b.status !== 'Hidden' &&
            b.status !== 'Maintenance' &&
            b.tideRestriction === 'Hoog water' &&
            b.nextServiceDue &&
            b.nextServiceDue < today &&
            !plannedBuoyIds.has(b.id) // Not already planned
        ).sort((a, b) => new Date(a.nextServiceDue).getTime() - new Date(b.nextServiceDue).getTime()); // Oldest first

        if (overdueHoogWaterBuoys.length === 0) {
            return NextResponse.json({ message: "No overdue Hoog water buoys need planning.", plannedCount: 0 });
        }

        // 2. Fetch High Tide Windows for coming 14 days
        const hwWindows = await getFutureHighTides();
        if (hwWindows.length === 0) {
            return NextResponse.json({ message: "No suitable High Water windows found between 11h-16h in the next 14 days.", plannedCount: 0 });
        }

        // 3. Distribute buoys across available dates
        // Let's schedule max 2 buoys per valid High Water day
        const MAX_PER_DAY = 2;
        const assignedPlan: any[] = [];
        let buoyIndex = 0;

        for (const window of hwWindows) {
            if (buoyIndex >= overdueHoogWaterBuoys.length) break;

            // Assign up to MAX_PER_DAY buoys to this day
            for (let i = 0; i < MAX_PER_DAY; i++) {
                if (buoyIndex >= overdueHoogWaterBuoys.length) break;

                const buoy = overdueHoogWaterBuoys[buoyIndex];
                assignedPlan.push({
                    buoy_id: buoy.id,
                    planned_date: window.date,
                    notes: `Automatisch ingepland wegens Hoog water om ${window.time} (${window.level.toFixed(2)}m TAW). Vorige service: ${new Date(buoy.nextServiceDue).toLocaleDateString('nl-BE')}`,
                    created_at: new Date().toISOString()
                });
                buoyIndex++;
            }
        }

        // 4. Insert into DB
        if (assignedPlan.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('planning_entries')
                .insert(assignedPlan);

            if (insertError) throw insertError;
        }

        return NextResponse.json({
            message: `Successfully planned ${assignedPlan.length} buoys.`,
            plannedCount: assignedPlan.length,
            planDetails: assignedPlan
        });

    } catch (error: any) {
        console.error("Auto-plan Tide Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
