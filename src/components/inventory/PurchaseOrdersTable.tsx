import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, toBengaliNumerals } from "@/lib/i18n-utils";
import { CheckCircle, CreditCard, Store } from "lucide-react";
import { PurchaseOrder, PaymentStatus } from "@/integrations/appwrite/inventory";

interface PurchaseOrdersTableProps {
  orders: any[]; // Using any to support both Appwrite (ProcessOrder) and potential legacy structure
  suppliers?: any[];
  onEdit: (order: any) => void;
  onMarkAsReceived: (orderId: string) => void;
  onUpdatePayment?: (order: any) => void; // New callback for payment update modal
}

export function PurchaseOrdersTable({
  orders,
  suppliers,
  onEdit,
  onMarkAsReceived,
  onUpdatePayment,
}: PurchaseOrdersTableProps) {
  const { t, i18n } = useTranslation();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-700",
      received: "bg-green-500/20 text-green-700",
      cancelled: "bg-red-500/20 text-red-700",
    };

    return (
      <Badge className={variants[status] || "bg-gray-500/20 text-gray-700"}>
        {t(`inventory.${status}`) || status}
      </Badge>
    );
  };

  // Payment status badge with color coding
  const getPaymentStatusBadge = (paymentStatus: PaymentStatus | undefined, amountPaid: number, totalAmount: number) => {
    const status = paymentStatus || 'not_paid';
    const variants: Record<string, string> = {
      not_paid: "bg-red-500/20 text-red-600 border-red-500/30",
      partially_paid: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
      paid: "bg-green-500/20 text-green-600 border-green-500/30",
    };

    const labels: Record<string, string> = {
      not_paid: i18n.language === "bn" ? "অপরিশোধিত" : "Not Paid",
      partially_paid: i18n.language === "bn" ? "আংশিক" : "Partial",
      paid: i18n.language === "bn" ? "পরিশোধিত" : "Paid",
    };

    return (
      <div className="flex flex-col gap-1">
        <Badge className={`${variants[status]} border`}>
          {labels[status]}
        </Badge>
        {status === 'partially_paid' && (
          <span className="text-xs text-muted-foreground">
            {formatCurrency(amountPaid, i18n.language, "BDT")} / {formatCurrency(totalAmount, i18n.language, "BDT")}
          </span>
        )}
      </div>
    );
  };

  // Source badge (POS Refill vs Manual)
  const getSourceBadge = (source: string | undefined) => {
    if (source === 'pos_refill') {
      return (
        <Badge className="bg-purple-500/20 text-purple-600 border border-purple-500/30">
          <Store className="h-3 w-3 mr-1" />
          {i18n.language === "bn" ? "POS রিফিল" : "POS Refill"}
        </Badge>
      );
    }
    return null; // Don't show badge for manual orders
  };

  const getSupplierName = (order: any) => {
    if (order.supplierName) return order.supplierName;
    if (suppliers && order.supplierId) {
      const supplier = suppliers.find(s => s.$id === order.supplierId);
      if (supplier) return supplier.name;
    }
    // Fallback for potential legacy data
    if (order.suppliers?.name) return order.suppliers.name;
    return "-";
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => (
          <div
            key={order.$id || order.id}
            className="bg-card border rounded-lg p-4 space-y-3"
          >
            {/* Header: Supplier + Source Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{getSupplierName(order)}</span>
                {getSourceBadge(order.source) && (
                  <div className="mt-1">{getSourceBadge(order.source)}</div>
                )}
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {formatDate(new Date(order.createdAt || order.created_at), i18n.language)}
              </div>
            </div>

            {/* Status Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(order.status)}
              {getPaymentStatusBadge(
                order.paymentStatus,
                order.amountPaid || 0,
                order.totalAmount || order.total_amount || 0
              )}
            </div>

            {/* Total + Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">{t("inventory.totalAmount")}</p>
                <p className="font-bold text-lg">
                  {formatCurrency(order.totalAmount || order.total_amount || 0, i18n.language, "BDT")}
                </p>
              </div>
              <div className="flex gap-2">
                {order.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => onMarkAsReceived(order.$id || order.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{t("inventory.markAsReceived")}</span>
                    <span className="sm:hidden">✓</span>
                  </Button>
                )}
                {order.status === "received" && order.paymentStatus !== "paid" && onUpdatePayment && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdatePayment(order)}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{i18n.language === "bn" ? "পেমেন্ট" : "Payment"}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("inventory.supplier")}</TableHead>
              <TableHead>{t("inventory.orderStatus")}</TableHead>
              <TableHead>{i18n.language === "bn" ? "পেমেন্ট" : "Payment"}</TableHead>
              <TableHead className="text-right">{t("inventory.totalAmount")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead className="text-right">{t("common.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.$id || order.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-1">
                    <span>{getSupplierName(order)}</span>
                    {getSourceBadge(order.source)}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell>
                  {getPaymentStatusBadge(
                    order.paymentStatus,
                    order.amountPaid || 0,
                    order.totalAmount || order.total_amount || 0
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(order.totalAmount || order.total_amount || 0, i18n.language, "BDT")}
                </TableCell>
                <TableCell>
                  {formatDate(new Date(order.createdAt || order.created_at), i18n.language)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => onMarkAsReceived(order.$id || order.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t("inventory.markAsReceived")}
                      </Button>
                    )}
                    {order.status === "received" && order.paymentStatus !== "paid" && onUpdatePayment && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdatePayment(order)}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {i18n.language === "bn" ? "পেমেন্ট" : "Payment"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

