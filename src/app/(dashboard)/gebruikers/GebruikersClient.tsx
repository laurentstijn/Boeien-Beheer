"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { Loader2, UserX, Shield, Users, Save, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface AdminUser {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    user_metadata: {
        role?: string;
        zone?: string;
    };
}

export function GebruikersClient() {
    const { supabase } = useSupabase();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [adminConfirmTarget, setAdminConfirmTarget] = useState<{ id: string, zone: string } | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            if (!res.ok) throw new Error("Fout bij ophalen gebruikers");
            const data = await res.json();
            setUsers(data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (userId: string, updates: { role?: string, zone?: string }) => {
        setSavingId(userId);
        setError(null);
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;

            const currentRole = updates.role !== undefined ? updates.role : user.user_metadata?.role;
            const currentZone = updates.zone !== undefined ? updates.zone : user.user_metadata?.zone;

            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: currentRole, zone: currentZone })
            });

            if (!res.ok) {
                let errMessage = "Fout bij updaten";
                try {
                    const errData = await res.json();
                    errMessage = errData.error || errMessage;
                } catch (parseError) {
                    errMessage = await res.text() || errMessage;
                }
                throw new Error(errMessage);
            }

            // Sync lokaal
            setUsers(prev => prev.map(u => {
                if (u.id === userId) {
                    return { ...u, user_metadata: { ...u.user_metadata, ...updates } };
                }
                return u;
            }));

        } catch (e: any) {
            setError(e.message);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (userId: string, email: string) => {
        if (!confirm(`Weet je zeker dat je ${email} permanent wilt verwijderen? Dit verbreekt onmiddellijk hun toegang.`)) {
            return;
        }

        setSavingId(userId);
        setError(null);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await res.text());

            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e: any) {
            setError(e.message);
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-app-text-secondary">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p>Gebruikers ophalen...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4">
                <Shield className="w-6 h-6 text-blue-600 shrink-0" />
                <div className="text-sm text-blue-900">
                    <p className="font-bold mb-1">Hoe werkt dit?</p>
                    <p>Mensen kunnen zelf geen account maken. Jij moet nog steeds in Supabase even (via "Add user") een nieuw adres aanmaken. Maar <strong>daarna hoef je niet meer naar beneden te scrollen!</strong> Je kan meteen terug naar deze website poppen, en je zult die nieuwe medewerker hier in de lijst zien staan. Hier klik je dan gewoon simpel aan bij welke Zone ze horen!</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                    <strong>Fout:</strong> {error}
                </div>
            )}

            <div className="bg-app-surface border border-app-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-app-bg text-app-text-secondary border-b border-app-border">
                            <tr>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider">Account / E-mailadres</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider">Sectie / Zone</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider">Laatst Ingelogd</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Beheer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                            {users.map(user => {
                                const role = user.user_metadata?.role || "user";
                                const zone = user.user_metadata?.zone || "";
                                const isSaving = savingId === user.id;

                                return (
                                    <tr key={user.id} className="hover:bg-app-surface-hover transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-app-text-primary flex items-center gap-2">
                                                <Users className="w-4 h-4 text-app-text-secondary" />
                                                {user.email}
                                            </div>
                                            <div className="text-[10px] text-app-text-secondary mt-1 font-mono">
                                                Aangemaakt: {new Date(user.created_at).toLocaleDateString('nl-BE')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                disabled={isSaving || role === 'admin'}
                                                className="bg-app-bg border border-app-border rounded-lg px-3 py-1.5 text-app-text-primary disabled:opacity-50 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                                value={zone}
                                                onChange={(e) => handleUpdate(user.id, { zone: e.target.value })}
                                            >
                                                <option value="" disabled>Kies een zone...</option>
                                                <option value="zone_zeeschelde">Zeeschelde</option>
                                                <option value="zone_zeetijger">Zeetijger</option>
                                            </select>
                                            {(role !== 'admin' && !zone) && (
                                                <div className="text-[10px] text-red-500 mt-1 font-bold">⚠️ Toegang geblokkeerd: zone ontbreekt</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                disabled={isSaving}
                                                className={clsx(
                                                    "border rounded-lg px-3 py-1.5 font-bold disabled:opacity-50 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full",
                                                    role === 'admin' ? "bg-red-50 text-red-700 border-red-200" : "bg-app-bg text-app-text-primary border-app-border"
                                                )}
                                                value={role}
                                                onChange={(e) => {
                                                    const newRole = e.target.value;
                                                    if (newRole === 'admin') {
                                                        setAdminConfirmTarget({ id: user.id, zone });
                                                    } else {
                                                        handleUpdate(user.id, { role: newRole, zone });
                                                    }
                                                }}
                                            >
                                                <option value="user">Medewerker Vloot</option>
                                                <option value="admin">Administrator / Beheer</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-app-text-secondary text-xs">
                                            {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('nl-BE') : 'Nog nooit'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(user.id, user.email)}
                                                disabled={isSaving}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 inline-flex"
                                                title="Gebruiker verwijderen"
                                            >
                                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserX className="w-5 h-5" />}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Admin Confirm Modal */}
            {adminConfirmTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-app-surface border border-app-border rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <Shield className="w-6 h-6" />
                                <h3 className="text-lg font-bold">Admin Rechten Toekennen</h3>
                            </div>
                            <p className="text-app-text-secondary text-sm mb-6">
                                WAARSCHUWING: Een administrator kan alles bekijken en beheren, inclusief alle gebruikers, instellingen en zones. Weet u zeker dat u deze gebruiker volledige rechten wilt geven?
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setAdminConfirmTarget(null)}
                                    className="px-4 py-2 text-sm font-medium text-app-text-secondary hover:bg-app-surface-hover rounded-lg transition-colors border border-app-border"
                                >
                                    Annuleren
                                </button>
                                <button
                                    onClick={() => {
                                        handleUpdate(adminConfirmTarget.id, { role: 'admin', zone: '' });
                                        setAdminConfirmTarget(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                >
                                    Ja, Maak Admin
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
