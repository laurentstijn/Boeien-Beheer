import { NextResponse } from 'next/server';
import { generateBackupExcel } from '@/lib/backup';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // In the future, verify admin role here

        // 1. Generate Buffer using shared helper
        const buf = await generateBackupExcel();

        return new NextResponse(new Uint8Array(buf), {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="BoeienBeheer_Backup_${new Date().toISOString().split('T')[0]}.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
