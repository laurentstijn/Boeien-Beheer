"use client";

import dynamic from "next/dynamic";

const BuoyMapInternal = dynamic(() => import("./BuoyMapInternal"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-900 animate-pulse rounded-lg flex items-center justify-center text-gray-500">Kaart laden...</div>,
});

export function BuoyMap(props: any) {
    return <BuoyMapInternal {...props} />;
}
