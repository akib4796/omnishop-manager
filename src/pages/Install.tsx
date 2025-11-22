import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { promptInstall, isPWAInstalled, canInstallPWA } from "@/lib/pwa-manager";
import { Check, Download, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function Install() {
  const { t } = useTranslation();
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    setIsInstalled(isPWAInstalled());
    setCanInstall(canInstallPWA());

    const handlePWAInstallAvailable = () => setCanInstall(true);
    const handlePWAInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      toast.success(t("install.alreadyInstalled"));
    };

    window.addEventListener("pwaInstallAvailable", handlePWAInstallAvailable);
    window.addEventListener("pwaInstalled", handlePWAInstalled);

    return () => {
      window.removeEventListener("pwaInstallAvailable", handlePWAInstallAvailable);
      window.removeEventListener("pwaInstalled", handlePWAInstalled);
    };
  }, [t]);

  async function handleInstall() {
    const installed = await promptInstall();
    if (installed) {
      toast.success(t("install.alreadyInstalled"));
    }
  }

  const benefits = [
    { key: "benefit1", icon: Check },
    { key: "benefit2", icon: Check },
    { key: "benefit3", icon: Check },
    { key: "benefit4", icon: Check },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-success/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("install.title")}</CardTitle>
          <CardDescription>{t("install.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center">
              <Badge variant="secondary" className="mb-4 text-success">
                <Check className="h-3 w-3 mr-1" />
                {t("install.alreadyInstalled")}
              </Badge>
              <p className="text-sm text-muted-foreground">
                You can access OmniManager from your home screen!
              </p>
            </div>
          ) : (
            <Button
              onClick={handleInstall}
              disabled={!canInstall}
              className="w-full"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              {t("install.install")}
            </Button>
          )}

          <div className="space-y-3">
            <p className="font-medium text-sm">{t("install.benefits")}</p>
            {benefits.map(({ key, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <Icon className="h-4 w-4 text-success" />
                <span>{t(`install.${key}`)}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t text-center">
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Continue to App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
