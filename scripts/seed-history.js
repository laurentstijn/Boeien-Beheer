
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedHistory() {
    console.log('Finding buoy T-RO-03 nieuw...');

    // 1. Find the buoy
    const { data: buoy, error } = await supabase
        .from('deployed_buoys')
        .select('id')
        .ilike('name', '%T-RO-03%')
        .single();

    if (error || !buoy) {
        console.error('Buoy not found:', error);
        return;
    }

    console.log('Found buoy:', buoy.id);

    // 2. Insert logs
    const logs = [
        {
            deployed_buoy_id: buoy.id,
            buoy_id: buoy.id,
            technician: 'Stijn Laurent',
            service_date: '2025-08-15',
            description: 'Algemene inspectie. Lamp vervangen.',
            metadata: { light: { type: 'Sabik LED', status: 'replaced' } }
        },
        {
            deployed_buoy_id: buoy.id,
            buoy_id: buoy.id,
            technician: 'Team A',
            service_date: '2025-02-10',
            description: 'Ketting controle. Alles OK.',
            metadata: {}
        }
    ];

    const { error: insertError } = await supabase
        .from('maintenance_logs')
        .insert(logs);

    if (insertError) {
        console.error('Error seeding logs:', insertError);
    } else {
        console.log('Successfully seeded 2 maintenance logs for T-RO-03 nieuw!');
    }
}

seedHistory();
