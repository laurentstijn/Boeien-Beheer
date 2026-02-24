"use client";

import { Calendar, Sun, Moon, Loader2, Check, LogOut, Shield, Ship, Eye, KeyRound, X } from "lucide-react";
import { useState, useEffect, useTransition, useRef } from "react";
import { updateStockCountDate, setAdminZoneOverride } from "@/app/actions";
import { useSupabase } from "@/components/SupabaseProvider";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export function Header({ lastStockCountDate: initialDate }: { lastStockCountDate?: string }) {
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const formatDateForInput = (d: string) => {
        if (!d || d === "Onbekend" || !d.includes('-')) return "";
        const parts = d.split('-');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
        return "";
    };

    const formatDateForDisplay = (iso: string) => {
        if (!iso) return "Onbekend";
        const parts = iso.split('-');
        if (parts.length === 3) {
            return `${parseInt(parts[2])}-${parseInt(parts[1])}-${parts[0]}`;
        }
        return iso;
    };

    const [date, setDate] = useState(formatDateForInput(initialDate || ""));
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { supabase, session } = useSupabase();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSwitchingZone, startZoneTransition] = useTransition();

    // Password change state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess(false);

        if (newPassword.length < 6) {
            setPasswordError("Wachtwoord moet minimaal 6 tekens zijn.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Wachtwoorden komen niet overeen.");
            return;
        }

        setIsChangingPassword(true);
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        setIsChangingPassword(false);

        if (error) {
            setPasswordError(error.message);
        } else {
            setPasswordSuccess(true);
            setNewPassword("");
            setConfirmPassword("");
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordSuccess(false);
            }, 3000);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    const handleZoneSwitch = (newZone: string | null) => {
        startZoneTransition(async () => {
            await setAdminZoneOverride(newZone);
            // Full hard refresh to ensure server components deeply re-fetch queries using the new cookie
            window.location.reload();
        });
    };

    const isAdmin = session?.user?.user_metadata?.role === 'admin';
    const zone = session?.user?.user_metadata?.zone;

    // Optional: read current cookie to strictly highlight the UI, but we can default to 'all' visually
    const [currentOverride, setCurrentOverride] = useState<string | null>('all');
    useEffect(() => {
        const cookies = document.cookie.split('; ');
        const overrideCookie = cookies.find(row => row.startsWith('admin_zone_override='));
        if (overrideCookie) {
            setCurrentOverride(overrideCookie.split('=')[1]);
        }
    }, []);

    useEffect(() => {
        setDate(formatDateForInput(initialDate || ""));
    }, [initialDate]);

    useEffect(() => {
        // Check local storage for saved theme preference
        const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute("data-theme", savedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    const handleDateChange = (isoDate: string) => {
        setDate(isoDate);
        const displayDate = formatDateForDisplay(isoDate);
        setErrorMsg(null);
        startTransition(async () => {
            const res = await updateStockCountDate(displayDate);
            if (res.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else {
                setErrorMsg(res.message || "Fout bij opslaan");
                setTimeout(() => setErrorMsg(null), 5000);
            }
        });
    };

    const dateInputRef = useRef<HTMLInputElement>(null);

    const handleDateClick = () => {
        if (dateInputRef.current) {
            if ('showPicker' in HTMLInputElement.prototype) {
                try {
                    dateInputRef.current.showPicker();
                } catch (e) {
                    dateInputRef.current.focus();
                }
            } else {
                dateInputRef.current.focus();
            }
        }
    };

    return (
        <header className="h-16 bg-app-header-bg border-b border-app-border flex items-center justify-between px-6 text-app-text-secondary relative print:hidden">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-app-surface-hover rounded-full text-app-text-secondary hover:text-app-text-primary transition-colors"
                    title={theme === "dark" ? "Schakel naar licht thema" : "Schakel naar donker thema"}
                >
                    {theme === "dark" ? (
                        <Sun className="w-5 h-5" />
                    ) : (
                        <Moon className="w-5 h-5" />
                    )}
                </button>
            </div>

            {errorMsg && (
                <div className="absolute top-full right-6 z-50 mt-2 bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <span className="font-bold">FOUT:</span> {errorMsg}
                </div>
            )}

            <div className="flex items-center gap-6 text-sm">

                {session && (
                    <div className="flex items-center gap-3 mr-4 border-r border-app-border pr-6">
                        {isAdmin && (
                            <div className="flex items-center gap-4">
                                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                    <button
                                        disabled={isSwitchingZone}
                                        onClick={() => handleZoneSwitch('all')}
                                        className={clsx(
                                            "px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1",
                                            currentOverride === 'all' ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <Eye className="w-3 h-3" /> Alles
                                    </button>
                                    <button
                                        disabled={isSwitchingZone}
                                        onClick={() => handleZoneSwitch('zone_zeeschelde')}
                                        className={clsx(
                                            "px-2 py-1 text-xs font-semibold rounded-md transition-all",
                                            currentOverride === 'zone_zeeschelde' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Zeeschelde
                                    </button>
                                    <button
                                        disabled={isSwitchingZone}
                                        onClick={() => handleZoneSwitch('zone_zeetijger')}
                                        className={clsx(
                                            "px-2 py-1 text-xs font-semibold rounded-md transition-all",
                                            currentOverride === 'zone_zeetijger' ? "bg-white shadow-sm text-green-600" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Zeetijger
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 text-app-text-secondary hover:text-blue-500 transition-colors"
                            title="Wachtwoord wijzigen"
                        >
                            <KeyRound className="w-4 h-4" />
                            <span className="text-xs font-semibold hidden md:inline">Wachtwoord</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-app-text-secondary hover:text-red-500 transition-colors ml-1"
                        >
                            {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                            <span className="text-xs font-semibold">Uitloggen</span>
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-3 text-app-text-secondary">
                    <span className="font-medium whitespace-nowrap">Laatste telling:</span>
                    <div
                        onClick={handleDateClick}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 relative cursor-pointer",
                            saved ? "bg-green-500/10 border-green-500/30 text-green-500" :
                                errorMsg ? "bg-red-500/10 border-red-500/30 text-red-500" :
                                    "bg-app-bg border-app-border text-app-text-primary hover:border-blue-500/50"
                        )}
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : saved ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Calendar className="w-4 h-4 text-app-text-secondary" />
                        )}

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold min-w-[70px]">
                                {formatDateForDisplay(date)}
                            </span>
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={date}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="absolute inset-0 opacity-0 pointer-events-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
                    <div className="bg-app-bg border border-app-border rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
                        <button
                            onClick={() => setShowPasswordModal(false)}
                            className="absolute top-4 right-4 p-1 rounded-full hover:bg-app-surface-hover text-app-text-secondary"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold text-app-text-primary mb-2 flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-blue-500" />
                            Wachtwoord Wijzigen
                        </h2>
                        <p className="text-xs text-app-text-secondary mb-6 leading-relaxed">
                            Kies een nieuw persoonlijk wachtwoord. Je wordt hierna niet uitgelogd.
                        </p>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-widest mb-1.5">Nieuw Wachtwoord</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Minimaal 6 tekens"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-app-text-secondary uppercase tracking-widest mb-1.5">Bevestig Wachtwoord</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Typ nogmaals"
                                    required
                                />
                            </div>

                            {passwordError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg">
                                    {passwordError}
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 text-xs rounded-lg font-bold flex items-center gap-2">
                                    <Check className="w-4 h-4" /> Wachtwoord succesvol gewijzigd!
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isChangingPassword || passwordSuccess}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-all"
                            >
                                {isChangingPassword ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Wijziging Opslaan"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </header>
    );
}
