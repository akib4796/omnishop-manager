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
import { Product, Category } from "@/integrations/appwrite";

interface ProductsTableProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export function ProductsTable({ products, categories, onEdit, onDelete }: ProductsTableProps) {
  const { t, i18n } = useTranslation();

  // Helper to get category info
  const getCategory = (categoryId?: string) => {
    if (!categoryId) return null;
    return categories.find(c => c.$id === categoryId);
  };

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
            const isLowStock = product.currentStock <= product.lowStockThreshold;
            const category = getCategory(product.categoryId);

            return (
              <TableRow key={product.$id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  {category && (
                    <Badge
                      style={{
                        backgroundColor: (category.color || '#6B7280') + "20",
                        color: category.color || '#6B7280',
                      }}
                    >
                      {category.name}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{product.sku || "-"}</TableCell>
                <TableCell className="text-right">
                  <span className={isLowStock ? "text-destructive font-semibold" : ""}>
                    {i18n.language === "bn"
                      ? toBengaliNumerals(product.currentStock)
                      : product.currentStock}{" "}
                    {product.unit}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(product.purchasePrice, "BDT", i18n.language)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(product.sellingPrice, "BDT", i18n.language)}
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
                      onClick={() => onDelete(product.$id)}
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
