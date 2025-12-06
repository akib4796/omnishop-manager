import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/appwrite";
import { getPendingSales } from "@/lib/offline-db";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { FileDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [syncedSales, setSyncedSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportsData();
  }, []);

  async function loadReportsData() {
    setLoading(true);
    try {
      // Load pending offline sales
      const pending = await getPendingSales();
      setPendingSales(pending);

      // Load synced sales
      const { data } = await supabase
        .from('pending_sales')
        .select('*')
        .eq('synced', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        setSyncedSales(data);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Error loading reports");
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (price: number) => {
    const formatted = price.toFixed(2);
    return i18n.language === "bn" ? `৳ ${toBengaliNumerals(formatted)}` : `৳ ${formatted}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (i18n.language === "bn") {
      return new Intl.DateTimeFormat('bn-BD').format(date);
    }
    return new Intl.DateTimeFormat('en-US').format(date);
  };

  const totalRevenue = syncedSales.reduce((sum, sale) => sum + (sale.sale_data?.total || 0), 0);
  const pendingRevenue = pendingSales.reduce((sum, sale) => sum + (sale.sale_data?.total || 0), 0);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{t("reports.title")}</h1>
            </div>
            <LanguageSwitcher />
          </header>

          <div className="flex-1 p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("reports.totalRevenue")}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {formatPrice(totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("reports.totalTransactions")}: {i18n.language === "bn" ? toBengaliNumerals(syncedSales.length) : syncedSales.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("dashboard.pendingOfflineSales")}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">
                    {formatPrice(pendingRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {i18n.language === "bn" ? toBengaliNumerals(pendingSales.length) : pendingSales.length} {t("pos.offlineSalesCount", { count: pendingSales.length })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("reports.totalSales")}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(totalRevenue + pendingRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("common.total")}: {i18n.language === "bn" ? toBengaliNumerals(syncedSales.length + pendingSales.length) : (syncedSales.length + pendingSales.length)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Reports Tabs */}
            <Tabs defaultValue="synced" className="w-full">
              <TabsList>
                <TabsTrigger value="synced">{t("reports.salesReport")}</TabsTrigger>
                <TabsTrigger value="offline">{t("reports.offlineSalesReport")}</TabsTrigger>
              </TabsList>

              <TabsContent value="synced" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{t("reports.salesReport")}</CardTitle>
                      <Button size="sm" variant="outline">
                        <FileDown className="h-4 w-4 mr-2" />
                        {t("reports.export")}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p>{t("common.loading")}</p>
                    ) : syncedSales.length === 0 ? (
                      <p className="text-muted-foreground">{t("reports.noData")}</p>
                    ) : (
                      <div className="space-y-3">
                        {syncedSales.map((sale) => (
                          <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{formatDate(sale.created_at)}</p>
                              <p className="text-sm text-muted-foreground">
                                {sale.sale_data?.payment_method || 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-success">{formatPrice(sale.sale_data?.total || 0)}</p>
                              <p className="text-xs text-muted-foreground">
                                {i18n.language === "bn" ? toBengaliNumerals(sale.sale_data?.items?.length || 0) : sale.sale_data?.items?.length || 0} items
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="offline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("reports.offlineSalesReport")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p>{t("common.loading")}</p>
                    ) : pendingSales.length === 0 ? (
                      <p className="text-muted-foreground">{t("reports.noData")}</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingSales.map((sale) => (
                          <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg bg-warning/10">
                            <div>
                              <p className="font-medium">{formatDate(sale.created_at)}</p>
                              <p className="text-sm text-warning font-medium">{t("pos.willSyncLater")}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-warning">{formatPrice(sale.sale_data?.total || 0)}</p>
                              <p className="text-xs text-muted-foreground">
                                {i18n.language === "bn" ? toBengaliNumerals(sale.sale_data?.items?.length || 0) : sale.sale_data?.items?.length || 0} items
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
