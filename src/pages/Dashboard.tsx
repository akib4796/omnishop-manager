import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BarChart3, Package, ShoppingCart, Users } from "lucide-react";

export default function Dashboard() {
  const { t } = useTranslation();
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    const fetchTenant = async () => {
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
      }
    };

    fetchTenant();
  }, []);

  const stats = [
    {
      title: t("dashboard.totalSales"),
      value: "৳ 0",
      icon: ShoppingCart,
      description: t("dashboard.thisMonth"),
    },
    {
      title: t("dashboard.products"),
      value: "0",
      icon: Package,
      description: t("dashboard.inInventory"),
    },
    {
      title: t("dashboard.customers"),
      value: "0",
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
