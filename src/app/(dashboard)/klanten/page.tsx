import { getCustomers, getDeployedBuoys } from '@/lib/db';
import KlantenClient from './KlantenClient';
import { unstable_noStore as noStore } from 'next/cache';

export default async function KlantenPage() {
    noStore();
    
    const allBuoys = await getDeployedBuoys(true);
    const customers = await getCustomers();
    
    return <KlantenClient initialCustomers={customers} initialBuoys={allBuoys} />;
}
