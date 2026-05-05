'use server'

import { updateCustomer as dbUpdateCustomer, deleteCustomer as dbDeleteCustomer, Customer } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updateCustomer(customer: Customer) {
    await dbUpdateCustomer(customer);
    revalidatePath('/klanten');
    revalidatePath('/uitgelegd');
    revalidatePath('/');
}

export async function deleteCustomer(id: string) {
    await dbDeleteCustomer(id);
    revalidatePath('/klanten');
    revalidatePath('/uitgelegd');
    revalidatePath('/');
}
