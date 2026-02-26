"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface DashboardFrameProps {
    counts: Record<string, number>;
    lastStockCountDate: string;
    children: React.ReactNode;
}

export function DashboardFrame({ counts, lastStockCountDate, children }: DashboardFrameProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <>
            <Sidebar
                counts={counts}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
                <Header
                    lastStockCountDate={lastStockCountDate}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <main className="flex-1 overflow-auto p-4 lg:p-6 print:overflow-visible print:p-0">
                    {children}
                </main>
            </div>
        </>
    );
}
