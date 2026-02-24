import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { getInventoryCounts, getAppSettings } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [counts, settings] = await Promise.all([
    getInventoryCounts(),
    getAppSettings()
  ]);

  const lastStockCountDate = settings.find(s => s.key === 'last_stock_count_date')?.value || "Onbekend";

  return (
    <>
      <Sidebar counts={counts} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        <Header lastStockCountDate={lastStockCountDate} />
        <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </>
  );
}
