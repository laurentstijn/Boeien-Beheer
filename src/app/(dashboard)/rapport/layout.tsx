export default function RapportLayout({ children }: { children: React.ReactNode }) {
    return (
        <div data-rapport-page className="bg-white min-h-screen">
            {children}
        </div>
    );
}
