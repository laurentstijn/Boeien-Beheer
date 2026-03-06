import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, LayoutDashboard, Anchor, PlusCircle, ShieldAlert, Wrench } from 'lucide-react';
import clsx from 'clsx';

interface HelpPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const helpSteps = [
    {
        id: 'overview',
        title: 'Stock & Inventaris 📦',
        icon: LayoutDashboard,
        content: (
            <div className="space-y-4 text-app-text-secondary text-sm">
                <p>In de zijbalk vind je verschillende categorieën zoals <strong>Kettingen, Stenen, Boeien, Toptekens, Sluitingen, Zinkblokken, en Lampen</strong>.</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Overzicht:</strong> Bekijk direct hoeveel stuks er <em>In Opslag</em>, <em>Uitgelegd</em>, of <em>In Onderhoud</em> zijn.</li>
                    <li><strong>Stock Aanpassen:</strong> Gebruik de <code>+</code> en <code>-</code> knoppen om de voorraad aan te passen.</li>
                    <li><strong>Lage Voorraad:</strong> Zakt de voorraad onder het ingestelde minimum? Dan kleurt de status oranje of rood en verschijnt de waarschuwing.</li>
                </ul>
            </div>
        ),
        imagePath: '/help/overview.png',
    },
    {
        id: 'maintenance',
        title: 'Onderhoud Loggen ⚓',
        icon: Wrench,
        content: (
            <div className="space-y-4 text-app-text-secondary text-sm">
                <p>Log onderhoud en vervang onderdelen direct vanaf de "Uitgelegd" pagina.</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Klik op <strong>"Onderhoud Loggen"</strong> naast een boei om te beginnen.</li>
                    <li>Geef aan welke onderdelen vervangen zijn in The dropdown menu's.</li>
                    <li><strong>Nieuw Onderdeel:</strong> Mis je een onderdeel in de lijst? Scrol naar beneden in de keuzelijst en klik op <strong>"+ Nieuw onderdeel aanmaken"</strong> om direct een nieuw item in de stock toe te voegen.</li>
                    <li>Tijdens het loggen toont de app automatisch de waterstanden en geeft het een advies (bijv. "Enkel rond HW").</li>
                </ul>
            </div>
        ),
        imagePath: '/help/maintenance.png',
    },
    {
        id: 'deploy',
        title: 'Nieuwe Boei Uitleggen 🚀',
        icon: PlusCircle,
        content: (
            <div className="space-y-4 text-app-text-secondary text-sm">
                <p>Een boei in het water leggen doe je via de opvallende blauwe knop linksonder in het menu.</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Vul de naam in en bepaal de locatie (coördinaten).</li>
                    <li>Kies alle onderdelen uit de huidige voorraad (lamp, steen, etc.). De status hiervan springt bij bevestiging automatisch van "Opslag" naar "Uitgelegd".</li>
                    <li>Is de boei voor een externe klant? Vink dit aan; zo worden er aparte rapporten gegeneerd voor deze klant.</li>
                </ul>
            </div>
        ),
        imagePath: '/help/deploy.png',
    },
    {
        id: 'admin',
        title: 'Admins & Rapporten 📊',
        icon: ShieldAlert,
        content: (
            <div className="space-y-4 text-app-text-secondary text-sm">
                <p>Specifieke tools en weergaven exclusief voor beheerders.</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Instellingen:</strong> Beheer gebruikers, hun rollen (Admin/Gebruiker) en hun zones.</li>
                    <li><strong>Rapporten:</strong> Bekijk dagelijkse overzichten van acties of exporteer klant-specifieke logs.</li>
                    <li><strong>Export Backup:</strong> Met één druk op de knop download je The volledige database naar een Excel-bestand.</li>
                </ul>
            </div>
        ),
        imagePath: '/help/admin.png',
    },
    {
        id: 'tools',
        title: 'Handige Tools 🛠️',
        icon: Anchor,
        content: (
            <div className="space-y-4 text-app-text-secondary text-sm">
                <p>Extra hulpmiddelen om het werk te versnellen.</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Coördinaten Omzetten:</strong> In de zijbalk zit de Rekenmachine (Coördinaten Omzetten). Dit helpt je GPS data snel te vertalen naar het app-formaat.</li>
                    <li><strong>Notities / Handleidingen:</strong> Een bibliotheek voor PDF-handleidingen (zoals deze uitleg) over lampen en componenten.</li>
                </ul>
            </div>
        ),
        imagePath: '/help/tools.png',
    }
];

export function HelpPopup({ isOpen, onClose }: HelpPopupProps) {
    const [activeStep, setActiveStep] = useState(0);

    if (!isOpen) return null;

    const nextStep = () => {
        if (activeStep < helpSteps.length - 1) setActiveStep(activeStep + 1);
    };

    const prevStep = () => {
        if (activeStep > 0) setActiveStep(activeStep - 1);
    };

    const currentTopic = helpSteps[activeStep];
    const Icon = currentTopic.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-app-surface border border-app-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden text-left">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-app-border bg-app-bg/50">
                    <h2 className="text-xl font-bold text-app-text-primary flex items-center gap-2">
                        <Icon className="w-5 h-5 text-blue-500" />
                        <span className="hidden sm:inline">Basis Handleiding:</span> {currentTopic.title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 bg-app-bg hover:bg-app-surface-hover text-app-text-secondary rounded-lg transition-colors"
                        title="Sluiten"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col md:flex-row flex-1 min-h-0">
                    
                    {/* Sidebar Nav */}
                    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-app-border bg-app-surface/50 p-4 space-y-1 overflow-y-auto">
                        <h3 className="text-xs font-bold text-app-text-secondary uppercase tracking-widest mb-3">Onderwerpen</h3>
                        {helpSteps.map((step, index) => {
                            const StepIcon = step.icon;
                            const isActive = index === activeStep;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => setActiveStep(index)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                                        isActive 
                                            ? "bg-blue-600 text-white shadow-sm" 
                                            : "hover:bg-app-surface-hover hover:text-app-text-primary text-app-text-secondary"
                                    )}
                                >
                                    <StepIcon className={clsx("w-4 h-4 shrink-0", isActive ? "opacity-100" : "opacity-60")} />
                                    <span className="truncate">{step.title}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Details */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-app-bg/20">
                        {/* Title inside the main view for smaller screens or context */}
                        <h2 className="text-xl font-bold text-app-text-primary mb-6 flex items-center gap-2">
                           {currentTopic.title}
                        </h2>
                        
                        {currentTopic.content}

                        {/* Image Showcase */}
                        <div className="mt-8">
                            <h4 className="text-xs font-bold text-app-text-secondary uppercase tracking-widest mb-4">Voorbeeld</h4>
                            <div className="w-full bg-app-bg border border-app-border rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                                <img 
                                    src={currentTopic.imagePath} 
                                    alt={`Screenshot of ${currentTopic.title}`}
                                    className="w-full h-auto object-cover max-h-[50vh] object-top"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-app-border bg-app-surface flex items-center justify-between">
                    <div className="text-sm font-mono text-app-text-secondary font-medium">
                        Stap {activeStep + 1} / {helpSteps.length}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={prevStep}
                            disabled={activeStep === 0}
                            className="px-4 py-2 border border-app-border rounded-lg text-sm font-bold text-app-text-secondary hover:bg-app-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={activeStep === helpSteps.length - 1 ? onClose : nextStep}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                        >
                            {activeStep === helpSteps.length - 1 ? 'Klaar' : (
                                <>
                                    Volgende <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
