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
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {adjustments.map((adjustment) => (
          <div
            key={adjustment.id}
            className="bg-card border rounded-lg p-4 space-y-2"
          >
            <div className="flex justify-between items-start">
              <span className="font-medium">{adjustment.products?.name || "-"}</span>
              <span
                className={`font-bold ${adjustment.qty_change > 0 ? "text-green-600" : "text-red-600"
                  }`}
              >
                {adjustment.qty_change > 0 ? "+" : ""}
                {i18n.language === "bn"
                  ? toBengaliNumerals(adjustment.qty_change)
                  : adjustment.qty_change}{" "}
                {adjustment.products?.unit}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{adjustment.reason}</span>
              <span>{formatDate(new Date(adjustment.created_at), i18n.language)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
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
    </>
  );
}
