import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/appwrite";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";
import { StockAdjustmentsTable } from "./StockAdjustmentsTable";

export function StockAdjustments() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: adjustments, isLoading } = useQuery({
    queryKey: ["stock-adjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_adjustments")
        .select("*, products(name, unit)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("inventory.stockAdjustments")}</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("inventory.createAdjustment")}
        </Button>
      </div>

      {isLoading ? (
        <p>{t("common.loading")}</p>
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
