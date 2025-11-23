import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductDialog } from "@/components/products/ProductDialog";
import { ProductsTable } from "@/components/products/ProductsTable";
import { CategoryQuickAdd } from "@/components/products/CategoryQuickAdd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, toBengaliNumerals } from "@/lib/i18n-utils";

export default function Products() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, color)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(t("products.productDeleted"));
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = (productId: string) => {
    if (window.confirm(t("products.deleteConfirm"))) {
      deleteProductMutation.mutate(productId);
    }
  };

  const handleExportCSV = () => {
    if (!products || products.length === 0) return;

    const headers = [
      "Name",
      "SKU",
      "Barcode",
      "Category",
      "Purchase Price",
      "Selling Price",
      "Current Stock",
      "Low Stock Threshold",
      "Unit",
    ];

    const rows = products.map((p) => [
      p.name,
      p.sku || "",
      p.barcode || "",
      p.categories?.name || "",
      p.purchase_price,
      p.selling_price,
      p.current_stock,
      p.low_stock_threshold,
      p.unit,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString()}.csv`;
    a.click();
    toast.success(t("products.exportCSV"));
  };

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || product.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products?.filter(
    (p) => p.current_stock <= p.low_stock_threshold
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{t("products.title")}</h1>
              {lowStockProducts && lowStockProducts.length > 0 && (
                <p className="text-sm text-destructive mt-1">
                  {i18n.language === "bn"
                    ? toBengaliNumerals(lowStockProducts.length)
                    : lowStockProducts.length}{" "}
                  {t("products.lowStockAlert")}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                {t("products.exportCSV")}
              </Button>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("products.addProduct")}
              </Button>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("products.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("products.allCategories")}</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CategoryQuickAdd />
            </div>
          </div>

          {productsLoading ? (
            <p>{t("common.loading")}</p>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <ProductsTable
              products={filteredProducts}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t("products.noProducts")}
            </div>
          )}

          <ProductDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            product={editingProduct}
            categories={categories || []}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
