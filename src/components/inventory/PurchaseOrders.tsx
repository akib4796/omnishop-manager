import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/appwrite";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrderDialog } from "./PurchaseOrderDialog";
import { PurchaseOrdersTable } from "./PurchaseOrdersTable";
import { SupplierQuickAdd } from "./SupplierQuickAdd";

export function PurchaseOrders() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(name), purchase_order_items(*, products(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const markAsReceivedMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Get order items
      const { data: items } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", orderId);

      if (!items) throw new Error("No items found");

      // Update stock for each product
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("current_stock")
          .eq("id", item.product_id)
          .single();

        if (product) {
          await supabase
            .from("products")
            .update({
              current_stock: product.current_stock + item.qty,
            })
            .eq("id", item.product_id);
        }
      }

      // Update order status
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "received",
          received_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(t("inventory.poReceived"));
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    setIsDialogOpen(true);
  };

  const handleMarkAsReceived = (orderId: string) => {
    markAsReceivedMutation.mutate(orderId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("inventory.purchaseOrders")}</h2>
        <div className="flex gap-2">
          <SupplierQuickAdd />
          <Button
            onClick={() => {
              setEditingOrder(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("inventory.createPurchaseOrder")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p>{t("common.loading")}</p>
      ) : purchaseOrders && purchaseOrders.length > 0 ? (
        <PurchaseOrdersTable
          orders={purchaseOrders}
          onEdit={handleEdit}
          onMarkAsReceived={handleMarkAsReceived}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {t("inventory.noPurchaseOrders")}
        </div>
      )}

      <PurchaseOrderDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        order={editingOrder}
      />
    </div>
  );
}
