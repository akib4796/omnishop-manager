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
import { CheckCircle } from "lucide-react";

interface PurchaseOrdersTableProps {
  orders: any[];
  onEdit: (order: any) => void;
  onMarkAsReceived: (orderId: string) => void;
}

export function PurchaseOrdersTable({
  orders,
  onEdit,
  onMarkAsReceived,
}: PurchaseOrdersTableProps) {
  const { t, i18n } = useTranslation();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-700",
      received: "bg-green-500/20 text-green-700",
      cancelled: "bg-red-500/20 text-red-700",
    };

    return (
      <Badge className={variants[status]}>
        {t(`inventory.${status}`)}
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("inventory.supplier")}</TableHead>
            <TableHead>{t("inventory.orderStatus")}</TableHead>
            <TableHead className="text-right">{t("inventory.totalAmount")}</TableHead>
            <TableHead>{t("common.date")}</TableHead>
            <TableHead className="text-right">{t("common.action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.suppliers?.name || "-"}
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.total_amount, i18n.language, "BDT")}
              </TableCell>
              <TableCell>
                {formatDate(new Date(order.created_at), i18n.language)}
              </TableCell>
              <TableCell className="text-right">
                {order.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => onMarkAsReceived(order.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("inventory.markAsReceived")}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
