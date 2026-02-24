import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { listManualsAction, uploadManualAction, deleteManualAction } from '@/app/actions';
import { FileText, Upload, Trash2, Download, BookOpen, Loader2, X, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface ManualFile {
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: {
        size: number;
        mimetype: string;
    };
}

export function ManualsLibrary({ zone = '' }: { zone?: string }) {
    const [files, setFiles] = useState<ManualFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const prefix = zone ? `${zone}/` : '';

    const loadFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await listManualsAction(prefix);
            if (!result.success) {
                throw new Error(result.message);
            }
            // Trust the server action to return the correctly typed and filtered ManualFiles
            setFiles((result.data as unknown as ManualFile[]) || []);
        } catch (err: any) {
            console.error('Error loading manuals:', err);
            setError(err.message || 'Kon handleidingen niet laden.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            alert('Enkel PDF bestanden zijn toegestaan.');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            alert('Het bestand is te groot (max 20MB).');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // Ensure unique filename by prepending timestamp if needed, but for manuals we might want original name
            let filename = file.name;
            const existingMatch = files.find(f => f.name === filename);
            if (existingMatch) {
                if (!confirm(`Er bestaat al een bestand met de naam "${filename}". Wil je deze overschrijven?`)) {
                    setUploading(false);
                    return;
                }
            }

            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadManualAction(formData, prefix);

            if (!result.success) throw new Error(result.message);

            // Refresh list
            await loadFiles();
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Upload gefaald.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Ben je zeker dat je "${filename}" wil verwijderen?`)) return;

        setLoading(true);
        try {
            const result = await deleteManualAction(filename, prefix);
            if (!result.success) throw new Error(result.message);

            setFiles(files.filter(f => f.name !== filename));
        } catch (err: any) {
            console.error('Delete error:', err);
            alert('Kon bestand niet verwijderen.');
        } finally {
            setLoading(false);
        }
    };

    const getFileUrl = (filename: string) => {
        const path = prefix ? `${prefix}${filename}` : filename;
        const { data } = supabase.storage.from('manuals').getPublicUrl(path);
        return data.publicUrl;
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="flex flex-col h-full bg-app-surface w-full p-6 md:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-app-text-primary flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-amber-500" />
                            Bibliotheek
                        </h1>
                        <p className="text-sm text-app-text-secondary mt-2">
                            Centrale opslag voor alle handleidingen (PDF). {zone ? `Deze bestanden zijn alleen zichtbaar voor ${zone.replace('zone_', '')}.` : 'Deze bibliotheek is gedeeld voor alle gebruikers.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadFiles}
                            disabled={loading || uploading}
                            className="p-3 bg-app-bg text-app-text-secondary border border-app-border rounded-xl hover:bg-app-surface-hover hover:border-app-border-hover transition-colors shadow-sm disabled:opacity-50"
                            title="Vernieuwen"
                        >
                            <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            accept="application/pdf"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading || uploading}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                        >
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            Upload PDF
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-500 flex items-center gap-3">
                        <X className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                {loading && files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin text-app-text-secondary mb-4" />
                        <p className="font-bold text-app-text-secondary">Handleidingen laden...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="border-2 border-dashed border-app-border rounded-3xl p-16 text-center text-app-text-secondary/60 flex flex-col items-center justify-center bg-app-bg/50">
                        <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-xl font-bold text-app-text-primary mb-2">Geen handleidingen gevonden</h3>
                        <p className="text-sm max-w-sm mb-6">Upload PDF handleidingen van lampen, boeien of andere infrastructuur om ze hier te centraliseren.</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-app-surface border-2 border-app-border hover:border-blue-500 hover:text-blue-500 rounded-xl font-bold transition-colors"
                        >
                            Selecteer Bestand
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {files.map((file) => (
                            <div key={file.id} className="bg-app-bg border border-app-border hover:border-blue-500/30 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all flex flex-col relative">
                                <a
                                    href={getFileUrl(file.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-6 pb-4 flex flex-col gap-4 flex-1 items-center text-center cursor-pointer"
                                >
                                    <div className="w-16 h-16 rounded-2xl border-4 border-app-surface bg-red-50 text-red-500 shadow-inner flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div className="w-full">
                                        <h3 className="font-bold text-sm text-app-text-primary break-words line-clamp-2" title={file.name}>
                                            {file.name}
                                        </h3>
                                        <p className="text-[10px] text-app-text-secondary uppercase tracking-widest mt-2 font-bold opacity-60">
                                            {formatBytes(file.metadata?.size || 0)}
                                        </p>
                                    </div>
                                </a>

                                <div className="p-3 border-t border-app-border bg-app-surface flex items-center justify-between">
                                    <span className="text-[10px] text-app-text-secondary opacity-60">
                                        {new Date(file.created_at).toLocaleDateString('nl-BE')}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <a
                                            href={getFileUrl(file.name)}
                                            download={file.name}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 text-app-text-secondary hover:text-blue-500 hover:bg-blue-50/50 rounded transition-colors"
                                            title="Downloaden"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                        <button
                                            onClick={(e) => { e.preventDefault(); handleDelete(file.name); }}
                                            className="p-1.5 text-app-text-secondary hover:text-red-500 hover:bg-red-50/50 rounded transition-colors"
                                            title="Verwijderen"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
