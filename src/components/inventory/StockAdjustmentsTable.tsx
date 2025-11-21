import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, toBengaliNumerals } from "@/lib/i18n-utils";

interface StockAdjustmentsTableProps {
  adjustments: any[];
}

export function StockAdjustmentsTable({ adjustments }: StockAdjustmentsTableProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("inventory.product")}</TableHead>
            <TableHead className="text-right">{t("inventory.qtyChange")}</TableHead>
            <TableHead>{t("inventory.reason")}</TableHead>
            <TableHead>{t("common.date")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adjustments.map((adjustment) => (
            <TableRow key={adjustment.id}>
              <TableCell className="font-medium">
                {adjustment.products?.name || "-"}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    adjustment.qty_change > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {adjustment.qty_change > 0 ? "+" : ""}
                  {i18n.language === "bn"
                    ? toBengaliNumerals(adjustment.qty_change)
                    : adjustment.qty_change}{" "}
                  {adjustment.products?.unit}
                </span>
              </TableCell>
              <TableCell>{adjustment.reason}</TableCell>
              <TableCell>
                {formatDate(new Date(adjustment.created_at), i18n.language)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
