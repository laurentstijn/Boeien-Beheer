'use client';

import { X } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Bevestigen',
    cancelLabel = 'Annuleren',
    variant = 'danger'
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-app-text-primary">
                        {title}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-app-surface-hover rounded-full text-app-text-secondary hover:text-app-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-app-text-secondary mb-6 leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-app-border text-app-text-primary font-medium hover:bg-app-surface-hover transition-all"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={clsx(
                            "flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95",
                            variant === 'danger' && "bg-red-600 hover:bg-red-700",
                            variant === 'warning' && "bg-orange-500 hover:bg-orange-600",
                            variant === 'info' && "bg-blue-600 hover:bg-blue-700"
                        )}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
