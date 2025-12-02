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
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, toBengaliNumerals } from "@/lib/i18n-utils";

interface ProductsTableProps {
  products: any[];
  onEdit: (product: any) => void;
  onDelete: (productId: string) => void;
}

export function ProductsTable({ products, onEdit, onDelete }: ProductsTableProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("products.productName")}</TableHead>
            <TableHead>{t("products.category")}</TableHead>
            <TableHead>{t("products.sku")}</TableHead>
            <TableHead className="text-right">{t("products.currentStock")}</TableHead>
            <TableHead className="text-right">{t("products.purchasePrice")}</TableHead>
            <TableHead className="text-right">{t("products.sellingPrice")}</TableHead>
            <TableHead className="text-right">{t("common.action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const isLowStock = product.current_stock <= product.low_stock_threshold;
            return (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  {product.categories && (
                    <Badge
                      style={{
                        backgroundColor: product.categories.color + "20",
                        color: product.categories.color,
                      }}
                    >
                      {product.categories.name}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{product.sku || "-"}</TableCell>
                <TableCell className="text-right">
                  <span className={isLowStock ? "text-destructive font-semibold" : ""}>
                    {i18n.language === "bn"
                      ? toBengaliNumerals(product.current_stock)
                      : product.current_stock}{" "}
                    {product.unit}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(product.purchase_price, "BDT", i18n.language)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(product.selling_price, "BDT", i18n.language)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
