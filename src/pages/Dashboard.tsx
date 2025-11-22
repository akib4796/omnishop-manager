import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Package, ShoppingCart, Users, Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { getPendingSales } from "@/lib/offline-db";
import { syncManager } from "@/lib/sync-manager";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { toast } from "sonner";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [tenantName, setTenantName] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [productsCount, setProductsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();

    const handleOnline = () => {
      setIsOnline(true);
      syncManager.syncAll();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Auto-sync every 30 seconds when online
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncManager.syncAll();
      }
    }, 30000);

    // Set up sync callback
    const unsubscribe = syncManager.onSyncStatusChange((status) => {
      if (status === 'syncing') {
        setSyncing(true);
      } else {
        setSyncing(false);
        if (status === 'success') {
          setLastSyncTime(new Date());
          loadPendingSales();
        }
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(syncInterval);
      unsubscribe();
    };
  }, []);

  async function fetchDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("business_name")
          .eq("id", profile.tenant_id)
          .single();

        if (tenant) {
          setTenantName(tenant.business_name);
        }

        // Fetch products count
        const { count: productsCount } = await supabase
          .from("products")
          .select("*", { count: 'exact', head: true })
          .eq("tenant_id", profile.tenant_id);

        setProductsCount(productsCount || 0);

        // Fetch customers count
        const { count: customersCount } = await supabase
          .from("customers")
          .select("*", { count: 'exact', head: true })
          .eq("tenant_id", profile.tenant_id);

        setCustomersCount(customersCount || 0);
      }

      await loadPendingSales();
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }

  async function loadPendingSales() {
    const pending = await getPendingSales();
    setPendingSalesCount(pending.length);
  }

  async function handleForceSync() {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    try {
      await syncManager.syncAll();
      toast.success(t("settings.dataSynced"));
    } catch (error) {
      toast.error(t("settings.syncFailed"));
    } finally {
      setSyncing(false);
    }
  }

  const formatCount = (count: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(count) : count;
  };

  const formatTime = () => {
    if (!lastSyncTime) return t("sync.justNow");
    
    const diff = Math.floor((Date.now() - lastSyncTime.getTime()) / 60000);
    if (diff === 0) return t("sync.justNow");
    return t("sync.minutesAgo", { minutes: formatCount(diff) });
  };

  const stats = [
    {
      title: t("dashboard.totalSales"),
      value: "৳ 0",
      icon: ShoppingCart,
      description: t("dashboard.thisMonth"),
    },
    {
      title: t("dashboard.products"),
      value: formatCount(productsCount),
      icon: Package,
      description: t("dashboard.inInventory"),
    },
    {
      title: t("dashboard.customers"),
      value: formatCount(customersCount),
      icon: Users,
      description: t("dashboard.totalRegistered"),
    },
    {
      title: t("dashboard.revenue"),
      value: "৳ 0",
      icon: BarChart3,
      description: t("dashboard.thisMonth"),
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{t("menu.dashboard")}</h1>
            </div>
            <LanguageSwitcher />
          </header>

          <div className="flex-1 p-6 space-y-6">
            <div>
              <h2 className="text-3xl font-bold">{t("common.welcome")}, {tenantName}</h2>
              <p className="text-muted-foreground mt-1">
                {t("dashboard.businessToday")}
              </p>
            </div>

            {/* Sync Status Card */}
            <Card className={isOnline ? "border-success" : "border-destructive"}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isOnline ? (
                      <Wifi className="h-5 w-5 text-success" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium">
                        {t(isOnline ? "dashboard.online" : "dashboard.offline")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.lastSynced")}: {formatTime()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleForceSync}
                    disabled={syncing || !isOnline}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {t("dashboard.syncNow")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pending Offline Sales Card */}
            {pendingSalesCount > 0 && (
              <Card className="border-warning">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <CardTitle>{t("dashboard.pendingOfflineSales")}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-warning">
                    {formatCount(pendingSalesCount)}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t("pos.offlineSalesCount", { count: pendingSalesCount })}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.quickActions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.dashboardReady")}
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
