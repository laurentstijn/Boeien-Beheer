"use client";
export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="rp-print-btn no-print"
        >
            🖨️ Afdrukken
        </button>
    );
}
