import clsx from "clsx";

interface StoneIconProps {
    shape: string; // "Ovaal", "Rond", "Plat", "Vierkant"
    size?: "sm" | "md";
    className?: string;
}

export function StoneIcon({ shape, size = "md", className }: StoneIconProps) {
    const shapeLower = shape.toLowerCase();

    const sizeClasses = size === "sm" ? "w-5 h-5" : "w-6 h-6";

    // Different visual representations for each shape
    if (shapeLower === "ovaal") {
        // Oval/Ellipse
        return (
            <div
                className={clsx(
                    "bg-gray-600 border-2 border-gray-500",
                    sizeClasses,
                    "rounded-full",
                    className
                )}
                style={{ transform: "scaleX(1.3)" }}
                title={shape}
            />
        );
    }

    if (shapeLower === "rond") {
        // Circle
        return (
            <div
                className={clsx(
                    "bg-gray-600 border-2 border-gray-500 rounded-full",
                    sizeClasses,
                    className
                )}
                title={shape}
            />
        );
    }

    if (shapeLower === "plat") {
        // Flat/Rectangle (wider than tall)
        return (
            <div
                className={clsx(
                    "bg-gray-600 border-2 border-gray-500 rounded-sm",
                    size === "sm" ? "w-6 h-3" : "w-8 h-4",
                    className
                )}
                title={shape}
            />
        );
    }

    if (shapeLower === "vierkant") {
        // Square
        return (
            <div
                className={clsx(
                    "bg-gray-600 border-2 border-gray-500 rounded-sm",
                    sizeClasses,
                    className
                )}
                title={shape}
            />
        );
    }

    // Default fallback
    return (
        <div
            className={clsx(
                "bg-gray-500 border-2 border-gray-400 rounded",
                sizeClasses,
                className
            )}
            title={shape}
        />
    );
}
