
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTotals() {
    console.log('Verifying totals...');

    const { data: assets, error } = await supabase.from('assets').select('*');
    if (error) {
        console.error('Error fetching assets:', error);
        return;
    }

    console.log(`Total Assets in DB: ${assets.length}`);

    // Replicate page.tsx logic
    const jet9000Assets = assets.filter((a: any) => a.metadata?.model === 'JET 9000' || a.name.includes('JET 9000'));
    const jet2000Assets = assets.filter((a: any) => a.metadata?.model === 'JET 2000' || a.name.includes('JET 2000'));
    const mobilisBCAssets = assets.filter((a: any) => a.name.includes('BC1241') || a.metadata?.model?.includes('BC1241'));
    const mobilisAQAssets = assets.filter((a: any) => a.name.includes('AQ1500') || a.metadata?.model?.includes('AQ1500'));
    const jfcMarineAssets = assets.filter((a: any) => a.name.includes('JFC') || a.metadata?.model?.includes('JFC'));
    const sealiteAssets = assets.filter((a: any) => a.name.includes('SEALITE') || a.metadata?.model?.includes('SEALITE') || a.name.includes('SLB 1500'));

    const otherAssets = assets.filter((a: any) =>
        !jet9000Assets.find(x => x.id === a.id) &&
        !jet2000Assets.find(x => x.id === a.id) &&
        !mobilisBCAssets.find(x => x.id === a.id) &&
        !mobilisAQAssets.find(x => x.id === a.id) &&
        !jfcMarineAssets.find(x => x.id === a.id) &&
        !sealiteAssets.find(x => x.id === a.id)
    );

    console.log('--- Breakdown ---');
    console.log(`JET 9000: ${jet9000Assets.length}`);
    console.log(`JET 2000: ${jet2000Assets.length}`);
    console.log(`Mobilis BC: ${mobilisBCAssets.length}`);
    console.log(`Mobilis AQ: ${mobilisAQAssets.length}`);
    console.log(`JFC Marine: ${jfcMarineAssets.length}`);
    console.log(`Sealite: ${sealiteAssets.length}`);
    console.log(`Overige: ${otherAssets.length}`);

    const sum = jet9000Assets.length + jet2000Assets.length + mobilisBCAssets.length + mobilisAQAssets.length + jfcMarineAssets.length + sealiteAssets.length + otherAssets.length;
    console.log(`Sum of Categories: ${sum}`);

    if (sum === assets.length) {
        console.log('✅ MATCH: All assets are accounted for in the UI groups.');
    } else {
        console.error('❌ MISMATCH: Some assets are lost or double counted.');
    }

    // Status Breakdown
    const inStock = assets.filter(a => a.status === 'in_stock').length;
    const deployed = assets.filter(a => a.status === 'deployed').length;
    const maintenance = assets.filter(a => a.status === 'maintenance').length;
    console.log('--- Status ---');
    console.log(`In Stock: ${inStock}`);
    console.log(`Deployed: ${deployed}`);
    console.log(`Maintenance: ${maintenance}`);
}

verifyTotals();
