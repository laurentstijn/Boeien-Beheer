"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/SupabaseProvider";
import { Lock, Mail, Anchor, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { supabase } = useSupabase();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError("Login mislukt: " + error.message);
                setLoading(false);
            } else {
                router.push("/uitgelegd");
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || "Er is een onverwachte fout opgetreden.");
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-zinc-50 relative overflow-hidden p-4">
            {/* Marine Background Elements */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-xl shadow-blue-900/10 flex items-center justify-center mx-auto mb-4 border border-blue-100 overflow-hidden p-2">
                        <img src="/logo.png" alt="Boeien Beheer Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Boeien Beheer</h1>
                    <p className="text-slate-500 mt-2 font-medium">Log in om verder te gaan</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 p-8 border border-slate-100">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 pl-1">E-mailadres</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="schip@vloot.be"
                                    required
                                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white rounded-2xl text-slate-700 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none border hover:border-slate-200 focus:hover:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 pl-1">Wachtwoord</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white rounded-2xl text-slate-700 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none border hover:border-slate-200 focus:hover:border-transparent"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-2 group"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Aanmelden"
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-8 text-sm text-slate-400 font-medium">
                    Beveiligd platform voor interne Zeeschelde/Zeetijger assets
                </div>
            </div>
        </div>
    );
}
