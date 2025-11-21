import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { toBengaliNumerals } from "@/lib/i18n-utils";

export function SyncIndicator() {
  const { t, i18n } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [minutesAgo, setMinutesAgo] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Update minutes ago every minute
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastSync.getTime()) / 60000);
      setMinutesAgo(diff);
    }, 60000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [lastSync]);

  const displayMinutes = i18n.language === "bn" ? toBengaliNumerals(minutesAgo) : minutesAgo;

  return (
    <div
      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md ${
        isOnline ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"
      }`}
    >
      {isOnline ? (
        <Cloud className="h-3 w-3" />
      ) : (
        <CloudOff className="h-3 w-3" />
      )}
      <span>
        {isOnline ? t("sync.online") : t("sync.offline")} •{" "}
        {minutesAgo === 0
          ? t("sync.justNow")
          : t("sync.minutesAgo", { minutes: displayMinutes })}
      </span>
    </div>
  );
}
