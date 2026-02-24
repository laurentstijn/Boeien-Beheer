import clsx from "clsx";

interface ChainIconProps {
    color: string; // "Rood", "Blauw", "Geel", "Wit", "Groen", "Zwart"
    size?: "sm" | "md"; // sm for text/summary, md for list/tables
    className?: string;
}

export function ChainIcon({ color, size = "md", className }: ChainIconProps) {
    const inputLower = color.toLowerCase();

    // Base colors map
    const bgMap: Record<string, string> = {
        rood: "bg-red-500",
        blauw: "bg-blue-500",
        geel: "bg-yellow-500",
        wit: "bg-white",
        groen: "bg-green-500",
        zwart: "bg-gray-900",
        oranje: "bg-orange-500",
        paars: "bg-purple-500",
        roze: "bg-pink-500",
        bruin: "bg-amber-800",
        grijs: "bg-gray-400",
    };

    const borderMap: Record<string, string> = {
        wit: "border-gray-300",
        zwart: "border-gray-600",
    };

    // Find the first color key that exists in the input string
    let matchedColor = 'grijs'; // default
    let matchedKey = 'grijs';

    // Direct match check first
    if (bgMap[inputLower]) {
        matchedColor = bgMap[inputLower];
        matchedKey = inputLower;
    } else {
        // Search for color keywords in the string
        for (const [key, value] of Object.entries(bgMap)) {
            if (inputLower.includes(key)) {
                matchedColor = value;
                matchedKey = key;
                break;
            }
        }
    }

    const bgColor = matchedColor;
    const borderColor = borderMap[matchedKey] || "border-transparent";

    // Size variants
    // sm: just a dot (like in current summary)
    // md: a dot with a ring (like in current table) OR just a bigger dot? 
    // User said "different icons". To make them same, let's use the "dot with ring" style for both, 
    // or just the "dot" style. 
    // The "dot" is cleaner. Let's use a simple dot, maybe slightly larger for list.

    // actually, let's make "sm" a simple dot, and "md" a simple dot but larger.
    // If the user wants the "ring" effect, we can add it. 
    // The previous AssetTable used a ring. ChainSummary used a dot.
    // Let's standardise on the "Leaf" / "Dot" look.

    const sizeClasses = size === "sm" ? "w-3 h-3" : "w-4 h-4";

    return (
        <div
            className={clsx(
                "rounded-full border",
                bgColor,
                borderColor,
                sizeClasses,
                className
            )}
            title={color}
        />
    );
}
