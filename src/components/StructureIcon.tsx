
import React from 'react';
import clsx from 'clsx';

interface StructureIconProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function StructureIcon({ size = 'md', className }: StructureIconProps) {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };

    return (
        <div className={clsx("flex items-center justify-center", sizeClasses[size], className)} title="Structuur">
            <svg viewBox="0 0 24 24" className="w-full h-full">
                {/* Hexagon Truss Shape */}
                <path
                    d="M 12 3 L 20 7.5 L 20 16.5 L 12 21 L 4 16.5 L 4 7.5 Z"
                    className="stroke-gray-600 stroke-[1.5] fill-blue-500"
                />
                {/* Internal Truss Lines for detail */}
                <path
                    d="M 4 7.5 L 20 7.5 M 4 16.5 L 20 16.5 M 12 3 L 12 21"
                    className="stroke-gray-600/40 stroke-1 fill-none"
                />
            </svg>
        </div>
    );
}
