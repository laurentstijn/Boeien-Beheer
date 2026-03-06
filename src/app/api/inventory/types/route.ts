import { NextResponse } from 'next/server';
import { getItemTypes } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        
        if (!category) {
            return NextResponse.json({ error: 'Category parameter is required' }, { status: 400 });
        }

        const itemTypes = await getItemTypes(category);

        return NextResponse.json(itemTypes);
    } catch (error) {
        console.error(`Failed to fetch item types:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch item types' },
            { status: 500 }
        );
    }
}
