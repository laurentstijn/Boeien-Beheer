import clsx from "clsx";

interface BuoyIconProps {
    color: string; // "Geel", "Groen", "Rood", "Blauw", "Zwart", or combinations like "Blauw/Geel"
    size?: "sm" | "md" | "lg";
    variant?: "full" | "body"; // body = reserve drijflichaam (Legacy, kept for compat)
    shape?: "circle" | "half" | "quarter" | "triangle" | "square"; // Added IALA shapes
    className?: string;
    overdue?: boolean;
    type?: string; // Optional buoy type/name to help deduce shape
}

export function BuoyIcon({ color, size = "md", variant = "full", shape, className, overdue, type }: BuoyIconProps) {
    const sizeClasses = {
        sm: "w-5 h-5",
        md: "w-6 h-6",
        lg: "w-8 h-8"
    };

    const sizeClass = sizeClasses[size];

    // Color mapping
    const colorMap: Record<string, string> = {
        geel: "bg-yellow-400",
        yellow: "bg-yellow-400",
        groen: "bg-green-500",
        green: "bg-green-500",
        rood: "bg-red-500",
        red: "bg-red-500",
        blauw: "bg-blue-500",
        blue: "bg-blue-500",
        zwart: "bg-gray-700",
        black: "bg-gray-700",
        wit: "bg-white",
        white: "bg-white",
        noord: "bg-black",
        zuid: "bg-yellow-400",
        oost: "bg-black",
        west: "bg-yellow-400"
    };

    // Explicit fill map to preventing purging of these classes
    const fillMap: Record<string, string> = {
        geel: "fill-yellow-400",
        yellow: "fill-yellow-400",
        groen: "fill-green-500",
        green: "fill-green-500",
        rood: "fill-red-500",
        red: "fill-red-500",
        blauw: "fill-blue-500",
        blue: "fill-blue-500",
        zwart: "fill-gray-700",
        black: "fill-gray-700",
        wit: "fill-white",
        white: "fill-white",
        noord: "fill-black",
        zuid: "fill-yellow-400",
        oost: "fill-black",
        west: "fill-yellow-400"
    };

    // Helper to get raw color class
    const getBg = (c: string) => colorMap[c.toLowerCase()] || "bg-gray-500";

    // Check if it's a split/striped buoy
    const safeColor = color || "Onbekend";
    const separator = safeColor.includes('-') ? '-' : '/';
    let colors = safeColor.split(separator).map(c => c.trim().toLowerCase());

    // Handle cardinal marks (convert name to color combination)
    if (colors.length === 1) {
        const c = colors[0];
        if (c.includes('noord')) colors = ['zwart', 'geel'];
        else if (c.includes('zuid')) colors = ['geel', 'zwart'];
        else if (c.includes('oost')) colors = ['zwart', 'geel', 'zwart'];
        else if (c.includes('west')) colors = ['geel', 'zwart', 'geel'];
    }

    // Deduce IALA shape if not explicitly provided
    let finalShape = shape;
    if (!finalShape) {
        const cLower = safeColor.toLowerCase();
        const tLower = (type || "").toLowerCase();
        const searchPool = `${cLower} ${tLower}`;

        if (searchPool.includes('spits') || searchPool.includes('stuurboord') || searchPool.includes('starboard') || searchPool.includes('lateral-g')) {
            finalShape = 'triangle';
        } else if (searchPool.includes('plat') || searchPool.includes('bakboord') || searchPool.includes('port') || searchPool.includes('lateral-r')) {
            finalShape = 'square';
        } else if (searchPool.includes('cardinaal') || searchPool.includes('noord') || searchPool.includes('zuid') || searchPool.includes('oost') || searchPool.includes('west')) {
            finalShape = 'circle';
        } else if (cLower.includes('groen') || cLower.includes('green')) {
            finalShape = 'triangle';
        } else if (cLower.includes('rood') || cLower.includes('red')) {
            finalShape = 'square';
        } else {
            finalShape = 'circle';
        }
    }

    // Container for the icon
    const containerClasses = clsx(
        "flex items-center justify-center relative", // Center the shape in the allotted space
        sizeClass,
        className
    );

    const overdueHalo = overdue && (
        <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping -z-10" />
    );
    const overdueDot = overdue && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 border border-white rounded-full z-10 shadow-sm" />
    );

    // SVG Paths

    // Full Circle (Standard / Special Mark)
    const renderCircle = (fillClass: string) => (
        <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-sm">
            <circle cx="12" cy="12" r="10" className={clsx("stroke-black/20 stroke-[1.5]", fillClass)} />
        </svg>
    );

    // Triangle (Starboard / Starboard Hand Mark)
    const renderTriangle = (fillClass: string) => (
        <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-sm">
            <path d="M12 2L2 20h20Z" className={clsx("stroke-black/20 stroke-[1.5]", fillClass)} />
        </svg>
    );

    // Square/Rectangle (Port / Port Hand Mark)
    const renderSquare = (fillClass: string) => (
        <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-sm">
            <rect x="3" y="4" width="18" height="16" rx="1" className={clsx("stroke-black/20 stroke-[1.5]", fillClass)} />
        </svg>
    );

    // Half Circle (Right side)
    const renderHalf = (fillClass: string) => (
        <svg viewBox="0 0 24 24" className="w-full h-full">
            <path d="M 12 2 A 10 10 0 0 1 12 22 Z" className={clsx("stroke-gray-600 stroke-2", fillClass)} />
        </svg>
    );

    // Quarter Circle (Top Right)
    const renderQuarter = (fillClass: string) => (
        <svg viewBox="0 0 24 24" className="w-full h-full">
            <path d="M 12 12 L 12 2 A 10 10 0 0 1 22 12 Z" className={clsx("stroke-gray-600 stroke-2", fillClass)} />
        </svg>
    );

    // Color resolving helper for SVG fill
    const getFill = (c: string) => {
        return fillMap[c.toLowerCase()] || getBg(c).replace('bg-', 'fill-');
    };

    if (colors.length === 1) {
        const fill = getFill(colors[0]);

        return (
            <div className={containerClasses} title={color}>
                {overdueHalo}
                {overdueDot}
                {finalShape === 'triangle' && renderTriangle(fill)}
                {finalShape === 'square' && renderSquare(fill)}
                {finalShape === 'half' && renderHalf(fill)}
                {finalShape === 'quarter' && renderQuarter(fill)}
                {(finalShape === 'circle' || !finalShape) && renderCircle(fill)}
            </div>
        );
    }

    // Multi-color handling
    if (colors.length > 1) {
        const isCardinal = safeColor.toLowerCase().includes('noord') ||
            safeColor.toLowerCase().includes('zuid') ||
            safeColor.toLowerCase().includes('oost') ||
            safeColor.toLowerCase().includes('west') ||
            safeColor.toLowerCase().includes('cardinaal');

        return (
            <div
                className={clsx(
                    "border border-black/20 overflow-hidden rounded-full flex relative shadow-sm",
                    isCardinal ? "flex-col" : "flex-row",
                    sizeClass,
                    className
                )}
                title={color}
            >
                {overdueHalo}
                {overdueDot}
                {colors.map((c, i) => (
                    <div
                        key={i}
                        className={clsx(getBg(c))}
                        style={{
                            height: isCardinal ? `${100 / colors.length}%` : '100%',
                            width: isCardinal ? '100%' : `${100 / colors.length}%`
                        }}
                    />
                ))}
            </div>
        );
    }

    return null;
}
