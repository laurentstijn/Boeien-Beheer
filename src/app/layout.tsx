import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SupabaseProvider from "@/components/SupabaseProvider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Boei Beheer",
    description: "Boeienplein Inventaris & Management",
    icons: {
        icon: '/logo.png',
        apple: '/logo.png',
    },
    openGraph: {
        title: 'Boeien Beheer',
        description: 'Beveiligd platform voor interne Zeeschelde/Zeetijger assets',
        siteName: 'Boeien Beheer',
        images: [
            {
                url: '/logo.png',
                width: 800,
                height: 600,
            },
        ],
        locale: 'nl_BE',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased bg-app-bg text-app-text-primary flex h-screen overflow-hidden`}
            >
                <SupabaseProvider>
                    {children}
                </SupabaseProvider>
            </body>
        </html>
    );
}
