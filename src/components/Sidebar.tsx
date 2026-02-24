"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    Link as LinkIcon,
    CircleDot,
    Target,
    Layers,
    Triangle,
    Wrench,
    Lightbulb,
    Box,
    Ship,
    AlertTriangle,
    FileText,
    Plus,
    Settings,
    Download,
    ChevronDown,
    ChevronRight,
    ClipboardList
} from "lucide-react";
import clsx from "clsx";
import { useSupabase } from "@/components/SupabaseProvider";

// ... imports

interface SidebarProps {
    counts?: Record<string, number>;
}

export function Sidebar({ counts = {} }: SidebarProps) {
    const pathname = usePathname();
    const { session } = useSupabase();
    const isAdmin = session?.user?.user_metadata?.role === 'admin';
    const [openGroupTitle, setOpenGroupTitle] = useState<string | null>("Stock & Inventaris");

    const toggleGroup = (title: string | null) => {
        if (!title) return;
        setOpenGroupTitle(prev => prev === title ? null : title);
    };

    const navGroups = [
        {
            title: null,
            items: [
                { name: "Uitgelegd / Onderhoud", href: "/uitgelegd", icon: Ship, count: null },
                { name: "Stock Overzicht", href: "/overzicht", icon: LayoutDashboard, count: null },
                { name: "Notities / Handleidingen", href: "/notities", icon: FileText, count: null },
            ]
        },
        {
            title: "Stock & Inventaris",
            items: [
                { name: "Kettingen", href: "/kettingen", icon: LinkIcon, count: counts['Ketting'] || 0 },
                { name: "Stenen", href: "/stenen", icon: CircleDot, count: counts['Steen'] || 0 },
                { name: "Boeien", href: "/boeien", icon: Target, count: counts['Boei'] || 0 },
                { name: "Toptekens", href: "/toptekens", icon: Triangle, count: counts['Topteken'] || 0 },
                { name: "Sluitingen", href: "/sluitingen", icon: Wrench, count: counts['Sluiting'] || 0 },
                { name: "Zinkblokken", href: "/zinkblokken", icon: Layers, count: counts['Zinkblok'] || 0 },
                { name: "Lampen", href: "/lampen", icon: Lightbulb, count: counts['Lamp'] || 0 },
                { name: "Opslag", href: "/opslag", icon: Box, count: counts['Opslag'] || 0 },
                { name: "Lage Voorraad", href: "/lage-voorraad", icon: AlertTriangle, count: null },
            ]
        },
        {
            title: "Rapporten (Admin)",
            adminOnly: true,
            items: [
                { name: "Google planning", href: "/rapporten", icon: FileText, count: null },
                { name: "Dagelijks Rapport", href: "/dagelijks-rapport", icon: ClipboardList, count: null },
            ]
        },
    ];

    // Automatically open the group that contains the current active route, but only once on mount or route change
    // Using an effect avoids state updates during render.
    import_react_hooks_warning_is_fine_here_if_we_track_pathname: {
        const [lastPath, setLastPath] = useState(pathname);
        if (pathname !== lastPath) {
            setLastPath(pathname);
            const activeGroup = navGroups.find(g => g.items.some(i => i.href === pathname));
            if (activeGroup && activeGroup.title) {
                setOpenGroupTitle(activeGroup.title);
            }
        }
    }

    return (
        <aside className="w-64 bg-app-sidebar-bg border-r border-app-border flex flex-col h-screen text-app-text-secondary font-sans transition-colors print:hidden">
            {/* ... header ... */}
            <div className="p-6">
                <h1 className="text-xl font-bold text-app-text-primary flex items-center gap-2">
                    <div className="w-8 h-8 flex-shrink-0">
                        <img src="/logo.png" alt="Boei Beheer Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
                    </div>
                    <div>
                        Boei Beheer
                        <div className="text-xs text-app-text-secondary font-normal italic">Boeien Zeeschelde</div>
                    </div>
                </h1>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 space-y-4 pb-4 custom-scrollbar">
                {navGroups.filter(g => !g.adminOnly || isAdmin).map((group, groupIdx) => {
                    const isCollapsed = group.title !== null && openGroupTitle !== group.title;
                    return (
                        <div key={groupIdx} className="space-y-1">
                            {group.title && (
                                <button
                                    onClick={() => toggleGroup(group.title)}
                                    className="w-full flex items-center justify-between text-[10px] uppercase font-bold text-app-text-secondary tracking-wider pl-1 pr-2 mb-1 hover:text-app-text-primary transition-colors focus:outline-none"
                                >
                                    <span>{group.title}</span>
                                    <div className="text-app-text-secondary/50">
                                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </div>
                                </button>
                            )}
                            <div className={clsx(
                                "space-y-1 overflow-hidden transition-all duration-300",
                                isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100 mt-1"
                            )}>
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={clsx(
                                                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-blue-600 text-white shadow-sm"
                                                    : "hover:bg-app-surface-hover hover:text-app-text-primary"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className="w-4 h-4 transition-colors" />
                                                {item.name}
                                            </div>
                                            {item.count !== null && (
                                                <span className={clsx(
                                                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                                    isActive ? "bg-white/20 text-white" : "bg-app-surface-hover text-app-text-secondary border border-app-border"
                                                )}>
                                                    {item.count}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-app-border bg-app-surface/30 space-y-3">
                <Link
                    href="/uitleggen"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    Boei Uitleggen
                </Link>

                <a
                    href="/api/export-backup"
                    className="w-full bg-app-surface hover:bg-app-surface-hover text-app-text-secondary hover:text-blue-500 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all border border-app-border text-xs"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Download className="w-4 h-4" />
                    Export Backup (Excel)
                </a>
            </div>
        </aside>
    );
}
