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
import { Pencil, Trash2, Package } from "lucide-react";
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
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {products.map((product) => {
          const isLowStock = product.currentStock <= product.lowStockThreshold;
          const category = getCategory(product.categoryId);

          return (
            <div
              key={product.$id}
              className="bg-card border rounded-lg p-4 space-y-3"
            >
              {/* Header: Name + Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-semibold truncate">{product.name}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onDelete(product.$id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Category & SKU Row */}
              <div className="flex items-center gap-3 flex-wrap">
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
                {product.sku && (
                  <span className="text-xs text-muted-foreground">
                    SKU: {product.sku}
                  </span>
                )}
              </div>

              {/* Stock & Prices Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{t("products.currentStock")}</p>
                  <p className={`font-bold ${isLowStock ? "text-destructive" : ""}`}>
                    {i18n.language === "bn"
                      ? toBengaliNumerals(product.currentStock)
                      : product.currentStock}{" "}
                    <span className="text-xs font-normal">{product.unit}</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{t("products.purchasePrice")}</p>
                  <p className="font-medium text-sm">
                    {formatCurrency(product.purchasePrice, "BDT", i18n.language)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{t("products.sellingPrice")}</p>
                  <p className="font-bold text-primary text-sm">
                    {formatCurrency(product.sellingPrice, "BDT", i18n.language)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
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
    </>
  );
}

