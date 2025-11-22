import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { promptInstall, isPWAInstalled, canInstallPWA } from "@/lib/pwa-manager";
import { Download, X } from "lucide-react";
import { toast } from "sonner";

export function PWAInstallPrompt() {
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed
    const dismissed = localStorage.getItem('pwaPromptDismissed');
    const installed = isPWAInstalled();
    
    if (!dismissed && !installed) {
      setCanInstall(canInstallPWA());
      
      // Show prompt after 5 seconds
      const timer = setTimeout(() => {
        if (canInstallPWA()) {
          setShowPrompt(true);
        }
      }, 5000);

      const handlePWAInstallAvailable = () => {
        setCanInstall(true);
        if (!dismissed && !installed) {
          setShowPrompt(true);
        }
      };

      const handlePWAInstalled = () => {
        setShowPrompt(false);
        setCanInstall(false);
        toast.success(t("install.alreadyInstalled"));
      };

      window.addEventListener("pwaInstallAvailable", handlePWAInstallAvailable);
      window.addEventListener("pwaInstalled", handlePWAInstalled);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("pwaInstallAvailable", handlePWAInstallAvailable);
        window.removeEventListener("pwaInstalled", handlePWAInstalled);
      };
    }
  }, [t]);

  async function handleInstall() {
    const installed = await promptInstall();
    if (installed) {
      setShowPrompt(false);
      toast.success(t("install.alreadyInstalled"));
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', 'true');
  }

  if (!showPrompt || !canInstall) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm p-4">
      <Card className="shadow-lg border-primary">
        <CardHeader className="relative pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg">{t("install.title")}</CardTitle>
          <CardDescription>{t("install.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleInstall} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {t("install.install")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
