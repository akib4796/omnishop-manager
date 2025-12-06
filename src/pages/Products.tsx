import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Loader2 } from "lucide-react";
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
import { toBengaliNumerals } from "@/lib/i18n-utils";
import {
  getProducts,
  deleteProduct,
  Product,
  getCategories,
  Category
} from "@/integrations/appwrite";
import { useAuth } from "@/hooks/useAuth";

export default function Products() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Get tenant ID from current user's profile
  const tenantId = profile?.tenantId || '';

  // Fetch products from Appwrite
  const { data: products, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["products", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return await getProducts(tenantId);
    },
    enabled: !!tenantId,
  });

  // Fetch categories from Appwrite
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return await getCategories(tenantId);
    },
    enabled: !!tenantId,
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await deleteProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(t("products.productDeleted"));
    },
    onError: (error: Error) => {
      console.error('Delete error:', error);
      toast.error(t("common.error"));
    },
  });

  const handleEdit = (product: Product) => {
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

    // Find category names for each product
    const getCategoryName = (categoryId?: string) => {
      if (!categoryId || !categories) return "";
      const cat = categories.find(c => c.$id === categoryId);
      return cat?.name || "";
    };

    const rows = products.map((p) => [
      p.name,
      p.sku || "",
      p.barcode || "",
      getCategoryName(p.categoryId),
      p.purchasePrice,
      p.sellingPrice,
      p.currentStock,
      p.lowStockThreshold,
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

  // Filter products based on search and category
  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || product.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get low stock products
  const lowStockProducts = products?.filter(
    (p) => p.currentStock <= p.lowStockThreshold
  );

  // Show loading if no tenant
  if (!tenantId) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="p-6 flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

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
                    <SelectItem key={cat.$id} value={cat.$id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CategoryQuickAdd tenantId={tenantId} />
            </div>
          </div>

          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : productsError ? (
            <div className="text-center py-12 text-destructive">
              {t("common.error")}: {(productsError as Error).message}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <ProductsTable
              products={filteredProducts}
              categories={categories || []}
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
            tenantId={tenantId}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
