import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";
import { StockAdjustmentsTable } from "./StockAdjustmentsTable";
import { useAuth } from "@/hooks/useAuth";
import { getStockAdjustments } from "@/integrations/appwrite/inventory";

export function StockAdjustments() {
  const { t } = useTranslation();
  const { profile, isLoading: authLoading } = useAuth();
  const tenantId = profile?.tenantId;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: adjustments, isLoading } = useQuery({
    queryKey: ["stock-adjustments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getStockAdjustments(tenantId);
    },
    enabled: !!tenantId,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">{t("inventory.stockAdjustments")}</h2>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t("inventory.createAdjustment")}</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : adjustments && adjustments.length > 0 ? (
        <StockAdjustmentsTable adjustments={adjustments} />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {t("inventory.noAdjustments")}
        </div>
      )}

      <StockAdjustmentDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
