"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
    ClipboardList,
    Users,
    Calculator,
    X,
    Building2
} from "lucide-react";
import clsx from "clsx";
import { useSupabase } from "@/components/SupabaseProvider";
import CoordinateCalculator from "./CoordinateCalculator";
import { HelpPopup } from "./HelpPopup";
import { HelpCircle } from "lucide-react";


interface SidebarProps {
    counts?: Record<string, number>;
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ counts = {}, isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { session } = useSupabase();
    const isAdmin = session?.user?.user_metadata?.role === 'admin';
    const [openGroupTitle, setOpenGroupTitle] = useState<string | null>("Stock & Inventaris");
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const toggleGroup = (title: string | null) => {
        if (!title) return;
        setOpenGroupTitle(prev => prev === title ? null : title);
    };

    const navGroups = [
        {
            title: null,
            items: [
                { name: "Uitgelegd / Onderhoud", href: "/uitgelegd", icon: Ship, count: null },
                { name: "Klanten & Projecten", href: "/klanten", icon: Building2, count: null },
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
                { name: "Gebruikers", href: "/gebruikers", icon: Users, count: null },
                { name: "Google planning", href: "/rapporten", icon: FileText, count: null },
                { name: "Dagelijks Rapport", href: "/dagelijks-rapport", icon: ClipboardList, count: null },
                { name: "Rapporten Externe Klanten", href: "/rapporten/klanten", icon: Building2, count: null },
            ]
        },
    ];

    // Automatically open the group that contains the current active route
    // Using an effect avoids state updates during render.
    useEffect(() => {
        const activeGroup = navGroups.find(g => g.items.some(i => i.href === pathname));
        if (activeGroup && activeGroup.title) {
            setOpenGroupTitle(activeGroup.title);
        }
    }, [pathname]);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-app-sidebar-bg border-r border-app-border flex flex-col h-screen text-app-text-secondary font-sans transition-transform duration-300 print:hidden lg:translate-x-0 lg:static",
                isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="p-6 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-app-text-primary flex items-center gap-2">
                        <div className="w-8 h-8 flex-shrink-0">
                            <img src="/logo.png" alt="Boei Beheer Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
                        </div>
                        <div>
                            Boei Beheer
                            <div className="text-xs text-app-text-secondary font-normal italic">
                                Welkom {isAdmin ? 'Admin' : (session?.user?.user_metadata?.zone === 'zone_zeetijger' ? 'Zeetijger' : 'Zeeschelde')}
                            </div>
                        </div>
                    </h1>

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="p-2 lg:hidden hover:bg-app-surface-hover rounded-lg text-app-text-secondary"
                    >
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 space-y-4 pb-4 custom-scrollbar">
                    {navGroups.filter(g => !g.adminOnly || isAdmin).map((group, groupIdx) => {
                        const isCollapsed = isAdmin && group.title !== null && openGroupTitle !== group.title;
                        return (
                            <div key={groupIdx} className="space-y-1">
                                {group.title && (
                                    <button
                                        onClick={() => isAdmin && toggleGroup(group.title)}
                                        className={clsx(
                                            "w-full flex items-center justify-between text-[10px] uppercase font-bold text-app-text-secondary tracking-wider pl-1 pr-2 mb-1 transition-colors",
                                            isAdmin ? "hover:text-app-text-primary focus:outline-none cursor-pointer" : "cursor-default"
                                        )}
                                    >
                                        <span>{group.title}</span>
                                        {isAdmin && (
                                            <div className="text-app-text-secondary/50">
                                                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </div>
                                        )}
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
                                                onClick={() => onClose?.()}
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
                        onClick={() => onClose?.()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        Boei Uitleggen
                    </Link>

                    {isAdmin && (
                        <a
                            href="/api/export-backup"
                            className="w-full bg-app-surface hover:bg-app-surface-hover text-app-text-secondary hover:text-blue-500 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all border border-app-border text-xs"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Download className="w-4 h-4" />
                            Export Backup (Excel)
                        </a>
                    )}

                    <button
                        onClick={() => setIsCalculatorOpen(true)}
                        className="w-full bg-app-surface hover:bg-app-surface-hover text-app-text-secondary hover:text-blue-500 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all border border-app-border text-xs"
                    >
                        <Calculator className="w-4 h-4" />
                        Coördinaten Omzetten
                    </button>

                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="w-full bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm border border-blue-200 dark:border-blue-800 text-xs"
                    >
                        <HelpCircle className="w-4 h-4" />
                        Hoe werkt de app?
                    </button>
                    
                    <div className="pt-2 pb-1 text-center text-[10px] text-app-text-secondary/40 font-medium tracking-widest uppercase">
                        @laurentstijn
                    </div>
                </div>
            </aside>

            {/* Coordinate Calculator Modal */}
            {isCalculatorOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsCalculatorOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-app-surface border border-app-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsCalculatorOpen(false)}
                            className="absolute right-4 top-4 p-1.5 bg-app-bg hover:bg-app-surface-hover text-app-text-secondary rounded-lg transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <CoordinateCalculator />
                    </div>
                </div>
            )}

            <HelpPopup isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </>
    );
}
