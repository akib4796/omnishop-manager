import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { syncManager } from "@/lib/sync-manager";
import { getPendingSales, initOfflineDB } from "@/lib/offline-db";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { RefreshCw, Database, HardDrive } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      await initOfflineDB();
      
      // Get pending sales count
      const pending = await getPendingSales();
      setPendingCount(pending.length);

      // Estimate storage (rough calculation)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / (1024 * 1024);
        setStorageUsed(usedMB);
      }

      // Get offline mode setting from localStorage
      const offlineSetting = localStorage.getItem('offlineMode');
      setOfflineEnabled(offlineSetting !== 'false');
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  async function handleForceSync() {
    if (syncing) return;
    
    setSyncing(true);
    try {
      await syncManager.syncAll();
      toast.success(t("settings.dataSynced"));
      await loadSettings();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(t("settings.syncFailed"));
    } finally {
      setSyncing(false);
    }
  }

  function handleOfflineModeToggle(enabled: boolean) {
    setOfflineEnabled(enabled);
    localStorage.setItem('offlineMode', enabled.toString());
    toast.success(enabled ? t("settings.offlineModeDesc") : "Offline mode disabled");
  }

  const formatStorage = (mb: number) => {
    const formatted = mb.toFixed(2);
    return i18n.language === "bn" 
      ? `${toBengaliNumerals(formatted)} MB` 
      : `${formatted} MB`;
  };

  const formatCount = (count: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(count) : count;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
            </div>
            <LanguageSwitcher />
          </header>

          <div className="flex-1 p-6">
            <Tabs defaultValue="offline" className="w-full">
              <TabsList>
                <TabsTrigger value="offline">{t("settings.offlineMode")}</TabsTrigger>
                <TabsTrigger value="general">{t("settings.general")}</TabsTrigger>
                <TabsTrigger value="account">{t("settings.account")}</TabsTrigger>
              </TabsList>

              <TabsContent value="offline" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("settings.offlineMode")}</CardTitle>
                    <CardDescription>
                      {t("settings.offlineModeDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="offline-mode">{t("settings.enableOfflinePOS")}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t("settings.offlineModeDesc")}
                        </p>
                      </div>
                      <Switch
                        id="offline-mode"
                        checked={offlineEnabled}
                        onCheckedChange={handleOfflineModeToggle}
                      />
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{t("dashboard.pendingOfflineSales")}</p>
                            <p className="text-sm text-muted-foreground">{formatCount(pendingCount)} {t("pos.willSyncLater")}</p>
                          </div>
                        </div>
                        <Button
                          onClick={handleForceSync}
                          disabled={syncing || pendingCount === 0}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                          {t("settings.forceSyncNow")}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <HardDrive className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{t("settings.storageUsed")}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatStorage(storageUsed)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="general" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("settings.general")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{t("common.loading")}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("settings.account")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{t("common.loading")}</p>
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
