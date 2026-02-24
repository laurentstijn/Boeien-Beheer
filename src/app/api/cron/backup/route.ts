import { NextResponse } from 'next/server';
import { generateBackupExcel } from '@/lib/backup';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        const secret = process.env.CRON_SECRET;

        // Verify the cron job request is authenticated
        if (authHeader !== `Bearer ${secret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Generate Buffer
        const buf = await generateBackupExcel();
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `BoeienBeheer_Backup_${dateStr}.xlsx`;

        // 2. Configure Email Transporter
        // Note: The user needs to set these in their environment variables.
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // 3. Send Email
        const info = await transporter.sendMail({
            from: `"Boeien Beheer System" <${process.env.SMTP_USER}>`,
            to: process.env.BACKUP_EMAIL_TO,
            subject: `Wekelijkse Database Backup - ${dateStr}`,
            text: 'Beste beheerder,\n\nHierbij in de bijlage de automatische wekelijkse backup van de Boeien Beheer applicatie (assets, boeien en onderhoudshistoriek).\n\nMet vriendelijke groet,\nHet Systeem',
            html: '<p>Beste beheerder,</p><p>Hierbij in de bijlage de automatische wekelijkse backup van de Boeien Beheer applicatie (assets, boeien en onderhoudshistoriek).</p><p>Met vriendelijke groet,<br>Het Systeem</p>',
            attachments: [
                {
                    filename: filename,
                    content: buf,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            ]
        });

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error: any) {
        console.error('Email Backup Cron Job error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
