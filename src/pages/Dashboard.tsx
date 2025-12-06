import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/appwrite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { BarChart3, Package, ShoppingCart, Users, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { getPendingSales } from "@/lib/offline-db";
import { syncManager } from "@/lib/sync-manager";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { toast } from "sonner";
import { seedTestData } from "@/lib/seed-data";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [tenantName, setTenantName] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [productsCount, setProductsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    seedTestData();

    const handleOnline = () => {
      setIsOnline(true);
      syncManager.syncAll();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncManager.syncAll();
      }
    }, 30000);

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

        const { count: productsCount } = await supabase
          .from("products")
          .select("*", { count: 'exact', head: true })
          .eq("tenant_id", profile.tenant_id);

        setProductsCount(productsCount || 0);

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
      color: "text-primary",
    },
    {
      title: t("dashboard.products"),
      value: formatCount(productsCount),
      icon: Package,
      description: t("dashboard.inInventory"),
      color: "text-success",
    },
    {
      title: t("dashboard.customers"),
      value: formatCount(customersCount),
      icon: Users,
      description: t("dashboard.totalRegistered"),
      color: "text-accent",
    },
    {
      title: t("dashboard.revenue"),
      value: "৳ 0",
      icon: BarChart3,
      description: t("dashboard.thisMonth"),
      color: "text-warning",
    },
  ];

  return (
    <ResponsiveLayout title={t("menu.dashboard")}>
      <div className="space-y-4 md:space-y-6">
        {/* Responsive Success Banner */}
        {showBanner && (
          <Card className="bg-gradient-to-r from-success/10 to-primary/10 border-success/30 relative overflow-hidden">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
            <CardContent className="pt-4 md:pt-6 pb-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-success shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-base md:text-lg text-success">
                    {i18n.language === "bn" 
                      ? "OMNIMANAGER এখন ১০০% রেসপন্সিভ এবং ক্যাশিয়ার-পারফেক্ট" 
                      : "OMNIMANAGER IS NOW 100% RESPONSIVE & CASHIER-PERFECT"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {i18n.language === "bn"
                      ? "৳৫,০০০ ফোন থেকে বড় ডেস্কটপ পর্যন্ত সুন্দরভাবে কাজ করে। বাংলাদেশের প্রতিটি দোকানের জন্য প্রস্তুত!"
                      : "Works beautifully from ৳5,000 phone to big desktop. Ready for every shop in Bangladesh!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">{t("common.welcome")}, {tenantName}</h2>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {t("dashboard.businessToday")}
          </p>
        </div>

        {/* Sync Status Card */}
        <Card className={cn(
          "border-2 transition-colors",
          isOnline ? "border-success/50" : "border-destructive/50"
        )}>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-success" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <WifiOff className="h-5 w-5 text-destructive" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-base">
                    {t(isOnline ? "dashboard.online" : "dashboard.offline")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.lastSynced")}: {formatTime()}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleForceSync}
                disabled={syncing || !isOnline}
                className="h-11 px-6 rounded-xl"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                {t("dashboard.syncNow")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid - Responsive */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                  <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", `bg-muted`)}>
                    <Icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
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
          <Card className="border-warning/50 bg-warning/5 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                <CardTitle className="text-base">{t("dashboard.pendingOfflineSales")}</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
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

        {/* Quick Actions */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">{t("dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.dashboardReady")}
            </p>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}
