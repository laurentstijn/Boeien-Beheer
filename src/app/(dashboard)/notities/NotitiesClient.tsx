"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Plus,
    Search,
    MoreVertical,
    ChevronRight,
    ChevronDown,
    FileText,
    StickyNote,
    Trash2,
    Save,
    CheckCircle2,
    Clock,
    BookOpen
} from "lucide-react";
import { clsx } from "clsx";
import { ManualsLibrary } from "@/components/ManualsLibrary";
import { useSupabase } from "@/components/SupabaseProvider";
import debounce from "lodash/debounce";

interface NoteSection {
    id: string;
    name: string;
    color: string;
}

interface NotePage {
    id: string;
    section_id: string;
    title: string;
    content: string;
    updated_at: string;
}

const SECTION_COLORS = [
    { name: 'Purple', value: '#7719AA' },
    { name: 'Blue', value: '#0078D4' },
    { name: 'Red', value: '#D83B01' },
    { name: 'Green', value: '#107C10' },
    { name: 'Yellow', value: '#FFB900' },
    { name: 'Teal', value: '#008272' },
];

export default function NotitiesClient({ activeZone }: { activeZone: string | null }) {
    const { supabase, session } = useSupabase();
    const [zone, setZone] = useState<string>(activeZone || 'zone_zeeschelde');

    useEffect(() => {
        setZone(activeZone || 'zone_zeeschelde');
    }, [activeZone]);

    const [sections, setSections] = useState<NoteSection[]>([]);
    const [pages, setPages] = useState<NotePage[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog states for iOS PWA compatibility
    const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
    const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState("");

    // Initial Load from Supabase Database
    useEffect(() => {
        const fetchNotes = async () => {
            setIsLoading(true);
            try {
                // Fetch sections for this zone
                const { data: dbSections, error: sectionsError } = await supabase
                    .from('note_sections')
                    .select('*')
                    .eq('zone', zone)
                    .order('created_at', { ascending: true });

                if (sectionsError) throw sectionsError;

                const sectionsData = dbSections || [];
                setSections(sectionsData);

                if (sectionsData.length > 0) {
                    const sectionIds = sectionsData.map(s => s.id);
                    // Fetch pages for these sections
                    const { data: dbPages, error: pagesError } = await supabase
                        .from('note_pages')
                        .select('*')
                        .in('section_id', sectionIds)
                        .order('updated_at', { ascending: false });

                    if (pagesError) throw pagesError;

                    const pagesData = dbPages || [];
                    setPages(pagesData);

                    // Auto-select first section and its first page
                    const firstSectionId = sectionsData[0].id;
                    setSelectedSectionId(firstSectionId);
                    const firstPages = pagesData.filter((p: NotePage) => p.section_id === firstSectionId);
                    if (firstPages.length > 0) {
                        setSelectedPageId(firstPages[0].id);
                    }
                } else {
                    // No database sections yet, let's migrate from localStorage if present
                    const storagePrefix = `_${zone}`;
                    const savedSections = localStorage.getItem(`note_sections${storagePrefix}`);
                    const savedPages = localStorage.getItem(`note_pages${storagePrefix}`);

                    if (savedSections && savedPages && session?.user?.id) {
                        const parsedSections = JSON.parse(savedSections);
                        const parsedPages = JSON.parse(savedPages);

                        // We do a soft migration by creating them via UI automatically, or just letting the user start fresh.
                        // For simplicity, we just leave it empty and let users recreate, but we can also auto-seed here if we wanted.
                        // Actually, let's keep it pristine if DB is empty to prevent messy migrations.
                        setPages([]);
                        setSelectedSectionId(null);
                        setSelectedPageId(null);
                    }
                }
            } catch (error) {
                console.error("Error fetching notes:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotes();
    }, [zone, supabase, session]);

    const activeSection = useMemo(() =>
        sections.find(s => s.id === selectedSectionId),
        [sections, selectedSectionId]);

    const filteredPages = useMemo(() => {
        let result = pages.filter(p => p.section_id === selectedSectionId);
        if (searchTerm) {
            result = result.filter(p =>
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.content.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return result;
    }, [pages, selectedSectionId, searchTerm]);

    const activePage = useMemo(() =>
        pages.find(p => p.id === selectedPageId),
        [pages, selectedPageId]);

    const handleAddSection = () => {
        setIsAddingSection(true);
        setNewSectionName("");
    };

    const confirmAddSection = async () => {
        if (newSectionName.trim()) {
            const color = SECTION_COLORS[sections.length % SECTION_COLORS.length].value;
            const newDbSection = {
                name: newSectionName.trim(),
                color: color,
                zone: zone,
                created_by: session?.user?.id
            };

            const { data, error } = await supabase
                .from('note_sections')
                .insert([newDbSection])
                .select()
                .single();

            if (!error && data) {
                setSections([...sections, data]);
                setSelectedSectionId(data.id);
            } else {
                console.error("Failed to add section:", error);
            }
        }
        setIsAddingSection(false);
    };

    const handleAddPage = async () => {
        if (!selectedSectionId) return;

        const newDbPage = {
            section_id: selectedSectionId,
            title: 'Nieuwe Pagina',
            content: '',
        };

        const { data, error } = await supabase
            .from('note_pages')
            .insert([newDbPage])
            .select()
            .single();

        if (!error && data) {
            setPages([data, ...pages]);
            setSelectedPageId(data.id);
        } else {
            console.error("Failed to add page:", error);
        }
    };

    // Debounced save to Supabase to avoid spamming the database on every keystroke
    const savePageToDb = useMemo(
        () => debounce(async (pageId: string, updates: Partial<NotePage>) => {
            setIsSaving(true);
            const { error } = await supabase
                .from('note_pages')
                .update(updates)
                .eq('id', pageId);

            if (!error) {
                setLastSaved(new Date());
            } else {
                console.error("Failed to save page:", error);
            }
            setIsSaving(false);
        }, 1000),
        [supabase]
    );

    // Clean up debouncer on unmount
    useEffect(() => {
        return () => savePageToDb.cancel();
    }, [savePageToDb]);

    const updateActivePage = (updates: Partial<NotePage>) => {
        if (!selectedPageId) return;

        // Optimistic UI update
        const updatedTime = new Date().toISOString();
        setPages(prev => prev.map(p => {
            if (p.id === selectedPageId) {
                return { ...p, ...updates, updated_at: updatedTime };
            }
            return p;
        }));

        // Fire debounced DB save
        savePageToDb(selectedPageId, updates);
    };

    const confirmDeleteSection = async (id: string) => {
        // Optimistic delete
        setSections(sections.filter(s => s.id !== id));
        setPages(pages.filter(p => p.section_id !== id));
        if (selectedSectionId === id) {
            setSelectedSectionId(sections.filter(s => s.id !== id)[0]?.id || null);
        }
        setDeletingSectionId(null);

        await supabase.from('note_sections').delete().eq('id', id);
    };

    const confirmDeletePage = async (id: string) => {
        // Optimistic delete
        const remainingPages = pages.filter(p => p.id !== id);
        setPages(remainingPages);
        if (selectedPageId === id) {
            const siblingPages = remainingPages.filter(p => p.section_id === selectedSectionId);
            setSelectedPageId(siblingPages[0]?.id || null);
        }
        setDeletingPageId(null);

        await supabase.from('note_pages').delete().eq('id', id);
    };

    return (
        <div className="flex h-full bg-app-bg border-t border-app-border overflow-hidden">
            {/* COLUMN 1: SECTIONS */}
            <div className="w-16 md:w-64 bg-app-surface border-r border-app-border flex flex-col">
                <div className="p-4 border-b border-app-border flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest text-app-text-secondary hidden md:block">Notitieblok</h2>
                    <button
                        onClick={handleAddSection}
                        className="p-1.5 hover:bg-app-surface-hover rounded-lg text-blue-500 transition-all"
                        title="Nieuwe sectie"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {sections.map(section => (
                        <div key={section.id} className="flex flex-col">
                            <div
                                onClick={() => setSelectedSectionId(section.id)}
                                className={clsx(
                                    "group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-4",
                                    selectedSectionId === section.id
                                        ? "bg-app-surface-hover border-current"
                                        : "border-transparent hover:bg-app-surface-hover/50"
                                )}
                                style={{ color: section.color }}
                            >
                                <div
                                    className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.2)]"
                                    style={{ backgroundColor: section.color }}
                                />
                                <span className={clsx(
                                    "text-sm font-bold flex-1 truncate hidden md:block",
                                    selectedSectionId === section.id ? "text-app-text-primary" : "text-app-text-secondary"
                                )}>
                                    {section.name}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDeletingSectionId(section.id); }}
                                    className="opacity-50 md:opacity-0 md:group-hover:opacity-100 p-1 hover:text-red-500 transition-all block"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Inline Delete Confirmation */}
                            {deletingSectionId === section.id && (
                                <div className="px-4 py-2 bg-red-500/10 border-l-4 border-red-500 flex flex-col gap-2">
                                    <span className="text-xs text-red-500 font-bold">Hele sectie wissen?</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => confirmDeleteSection(section.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded font-bold">Ja, wis</button>
                                        <button onClick={() => setDeletingSectionId(null)} className="px-2 py-1 bg-app-surface-hover text-app-text-primary text-xs rounded font-bold">Annuleer</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Inline Add Section Form */}
                    {isAddingSection && (
                        <div className="px-4 py-3 bg-app-surface-hover border-l-4 border-blue-500 flex flex-col gap-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Naam sectie..."
                                value={newSectionName}
                                onChange={e => setNewSectionName(e.target.value)}
                                className="w-full bg-app-bg border border-app-border rounded px-2 py-1 text-xs text-app-text-primary focus:outline-none"
                                onKeyDown={e => e.key === 'Enter' && confirmAddSection()}
                            />
                            <div className="flex gap-2">
                                <button onClick={confirmAddSection} className="px-2 py-1 bg-blue-500 text-white text-xs rounded font-bold">Opslaan</button>
                                <button onClick={() => setIsAddingSection(false)} className="px-2 py-1 bg-app-surface text-app-text-secondary border border-app-border text-xs rounded font-bold">Annuleer</button>
                            </div>
                        </div>
                    )}

                    {/* Hardcoded Handleidingen (Manuals) Section */}
                    <div className="mt-4 pt-4 border-t border-app-border">
                        <div
                            onClick={() => setSelectedSectionId('manuals')}
                            className={clsx(
                                "group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-4",
                                selectedSectionId === 'manuals'
                                    ? "bg-amber-500/10 border-amber-500"
                                    : "border-transparent hover:bg-app-surface-hover/50"
                            )}
                            style={{ color: '#F59E0B' }}
                        >
                            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                                <BookOpen className="w-3.5 h-3.5" />
                            </div>
                            <span className={clsx(
                                "text-sm font-bold flex-1 truncate hidden md:block",
                                selectedSectionId === 'manuals' ? "text-amber-600" : "text-app-text-secondary group-hover:text-amber-600"
                            )}>
                                Handleidingen
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMN 2: PAGES */}
            {selectedSectionId && selectedSectionId !== 'manuals' && (
                <div className="w-48 md:w-72 bg-app-bg border-r border-app-border flex flex-col">
                    <div className="p-4 border-b border-app-border flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-app-text-secondary uppercase">Pagina's</h3>
                            <button
                                onClick={handleAddPage}
                                className="p-1 hover:bg-app-surface-hover rounded text-app-text-secondary hover:text-app-text-primary"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-app-text-secondary" />
                            <input
                                type="text"
                                placeholder="Zoeken..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-app-surface border border-app-border rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-blue-500/50 transition-all text-app-text-primary"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredPages.length === 0 ? (
                            <div className="p-8 text-center text-app-text-secondary/30">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-[10px]">Geen pagina's</p>
                            </div>
                        ) : (
                            filteredPages.map(page => (
                                <div key={page.id} className="flex flex-col">
                                    <div
                                        onClick={() => setSelectedPageId(page.id)}
                                        className={clsx(
                                            "group p-4 cursor-pointer border-b border-app-border/30 transition-all relative",
                                            selectedPageId === page.id
                                                ? "bg-white/[0.03] before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1 before:bg-blue-500 before:rounded-r-full"
                                                : "hover:bg-white/[0.01]"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className={clsx(
                                                "text-xs font-bold truncate pr-4",
                                                selectedPageId === page.id ? "text-app-text-primary" : "text-app-text-secondary"
                                            )}>
                                                {page.title || 'Naamloze pagina'}
                                            </h4>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeletingPageId(page.id); }}
                                                className="opacity-50 md:opacity-0 md:group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-app-text-secondary/60 line-clamp-2 leading-relaxed">
                                            {page.content || 'Geen extra tekst...'}
                                        </p>
                                        <div className="mt-2 flex items-center gap-1 text-[8px] text-app-text-secondary/40 font-medium">
                                            <Clock className="w-2.5 h-2.5" />
                                            {new Date(page.updated_at).toLocaleDateString('nl-BE')}
                                        </div>
                                    </div>

                                    {/* Inline Delete Confirmation for Page */}
                                    {deletingPageId === page.id && (
                                        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex flex-col gap-2">
                                            <span className="text-[10px] text-red-500 font-bold">Notitie definitief verwijderen?</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => confirmDeletePage(page.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] rounded font-bold">Ja, verwijder</button>
                                                <button onClick={() => setDeletingPageId(null)} className="px-2 py-1 bg-app-surface text-app-text-primary border border-app-border text-[10px] rounded font-bold">Annuleer</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* COLUMN 3: EDITOR OR MANUALS */}
            <div className="flex-1 bg-app-surface flex flex-col relative">
                {selectedSectionId === 'manuals' ? (
                    <ManualsLibrary zone={zone} />
                ) : activePage ? (
                    <>
                        <div className="p-4 md:px-12 md:py-8 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                            <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
                                {/* Saving Indicator / Section Context */}
                                <div className="flex items-center justify-between mb-4 h-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: activeSection?.color }} />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{activeSection?.name}</span>
                                    </div>
                                    {isSaving ? (
                                        <div className="flex items-center gap-2 text-[10px] text-blue-500 font-bold animate-pulse">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            Opslaan...
                                        </div>
                                    ) : lastSaved ? (
                                        <div className="flex items-center gap-1 text-[10px] text-app-text-secondary/30 font-medium uppercase tracking-tighter">
                                            <CheckCircle2 className="w-3 h-3 text-green-500/30" />
                                            Opgeslagen om {lastSaved.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    ) : null}
                                </div>

                                <input
                                    type="text"
                                    value={activePage.title}
                                    onChange={(e) => updateActivePage({ title: e.target.value })}
                                    placeholder="Titel..."
                                    className="text-3xl md:text-5xl font-black bg-transparent border-none focus:outline-none mb-6 text-app-text-primary placeholder:text-app-text-secondary/10"
                                />

                                <div className="flex-1 flex flex-col">
                                    <div className="w-full h-px bg-app-border mb-6" />
                                    <textarea
                                        value={activePage.content}
                                        onChange={(e) => updateActivePage({ content: e.target.value })}
                                        placeholder="Begin hier met typen..."
                                        className="flex-1 bg-transparent border-none focus:outline-none resize-none text-base md:text-lg leading-relaxed text-app-text-primary/80 placeholder:text-app-text-secondary/10"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-app-text-secondary/30">
                        <StickyNote className="w-20 h-20 mb-4 opacity-10" />
                        <h4 className="text-xl font-bold">Selecteer een pagina</h4>
                        <p className="text-sm">Of maak een nieuwe aan in het menu links.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
