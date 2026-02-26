import { DashboardFrame } from "@/components/DashboardFrame";
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
    <DashboardFrame counts={counts} lastStockCountDate={lastStockCountDate}>
      {children}
    </DashboardFrame>
  );
}
