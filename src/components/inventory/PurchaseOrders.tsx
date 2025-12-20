import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrderDialog } from "./PurchaseOrderDialog";
import { PurchaseOrdersTable } from "./PurchaseOrdersTable";
import { SupplierPaymentModal } from "./SupplierPaymentModal";
import { SupplierQuickAdd } from "./SupplierQuickAdd";
import { useAuth } from "@/hooks/useAuth";
import {
  getPurchaseOrders,
  getSuppliers,
  updatePurchaseOrderStatus,
  PurchaseOrder
} from "@/integrations/appwrite/inventory";
import { updateProductStock, getProducts } from "@/integrations/appwrite/products";

export function PurchaseOrders() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenantId;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PurchaseOrder | null>(null);

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["purchase-orders", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getPurchaseOrders(tenantId);
    },
    enabled: !!tenantId,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getSuppliers(tenantId);
    },
    enabled: !!tenantId,
  });

  const { data: products } = useQuery({
    queryKey: ["products", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getProducts(tenantId);
    },
    enabled: !!tenantId,
  });

  const markAsReceivedMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Find the order
      const order = purchaseOrders?.find(o => o.$id === orderId);
      if (!order) throw new Error("Order not found");

      // Update stock for each product in the order
      for (const item of order.items) {
        const product = products?.find(p => p.$id === item.productId);
        if (product) {
          await updateProductStock(item.productId, product.currentStock + item.quantity);
        }
      }

      // Update order status
      await updatePurchaseOrderStatus(orderId, 'received');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["products", tenantId] });
      toast.success(t("inventory.poReceived"));
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setIsDialogOpen(true);
  };

  const handleMarkAsReceived = (orderId: string) => {
    markAsReceivedMutation.mutate(orderId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">{t("inventory.purchaseOrders")}</h2>
        <div className="flex gap-2">
          <SupplierQuickAdd />
          <Button
            size="sm"
            onClick={() => {
              setEditingOrder(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("inventory.createPurchaseOrder")}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : purchaseOrders && purchaseOrders.length > 0 ? (
        <PurchaseOrdersTable
          orders={purchaseOrders}
          suppliers={suppliers || []}
          onEdit={handleEdit}
          onMarkAsReceived={handleMarkAsReceived}
          onUpdatePayment={(order) => setPaymentOrder(order)}
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

      {/* Supplier Payment Modal (Records in Ledger + Updates PO) */}
      <SupplierPaymentModal
        open={!!paymentOrder}
        onOpenChange={(open) => !open && setPaymentOrder(null)}
        purchaseOrder={paymentOrder}
      />
    </div>
  );
}

