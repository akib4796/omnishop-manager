import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import { ImageUpload } from "./ImageUpload";
import {
  createProduct,
  updateProduct,
  Product,
  Category
} from "@/integrations/appwrite";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  purchasePrice: z.string().min(1, "Purchase price is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  tradePrice: z.string().optional(),
  currentStock: z.string().min(1, "Current stock is required"),
  lowStockThreshold: z.string().optional(),
  unit: z.string().optional(),
  imageUrl: z.string().optional(),
  hasExpiry: z.boolean().default(false),
  expiryDate: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
  tenantId: string;
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  tenantId,
}: ProductDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      categoryId: "",
      purchasePrice: "0",
      sellingPrice: "0",
      tradePrice: "0",
      currentStock: "0",
      lowStockThreshold: "10",
      unit: "pcs",
      imageUrl: "",
      hasExpiry: false,
      expiryDate: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku || "",
        barcode: product.barcode || "",
        categoryId: product.categoryId || "",
        purchasePrice: (product.purchasePrice || 0).toString(),
        sellingPrice: (product.sellingPrice || 0).toString(),
        tradePrice: (product.tradePrice || 0).toString(),
        currentStock: product.currentStock.toString(),
        lowStockThreshold: (product.lowStockThreshold || 10).toString(),
        unit: product.unit || "pcs",
        imageUrl: product.imageUrl || "",
        hasExpiry: product.hasExpiry || false,
        expiryDate: product.expiryDate || "",
      });
    } else {
      form.reset({
        name: "",
        sku: "",
        barcode: "",
        categoryId: "",
        purchasePrice: "0",
        sellingPrice: "0",
        tradePrice: "0",
        currentStock: "0",
        lowStockThreshold: "10",
        unit: "pcs",
        imageUrl: "",
        hasExpiry: false,
        expiryDate: "",
      });
    }
  }, [product, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const productData = {
        name: data.name,
        sku: data.sku,
        barcode: data.barcode || undefined,
        categoryId: data.categoryId || undefined,
        purchasePrice: parseFloat(data.purchasePrice),
        sellingPrice: parseFloat(data.sellingPrice),
        tradePrice: parseFloat(data.tradePrice || "0"),
        currentStock: parseInt(data.currentStock),
        lowStockThreshold: data.lowStockThreshold ? parseInt(data.lowStockThreshold) : 10,
        unit: data.unit || "pcs",
        imageUrl: data.imageUrl || undefined,
        hasExpiry: data.hasExpiry,
        expiryDate: data.hasExpiry && data.expiryDate ? data.expiryDate : undefined,
        tenantId: tenantId,
      };

      if (product) {
        return await updateProduct(product.$id, productData);
      } else {
        return await createProduct(productData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        product ? t("products.productUpdated") : t("products.productAdded")
      );
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Save error:", error);
      toast.error(t("common.error") + ": " + error.message);
    },
  });

  const onSubmit = (data: ProductFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? t("products.editProduct") : t("products.addProduct")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.productName")}*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.category")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("products.selectCategory")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.$id} value={cat.$id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.sku")}</FormLabel>
                    <FormControl>
                      <Input placeholder="SKU-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.barcode")}</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.purchasePrice")}*</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.sellingPrice")}*</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tradePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.tradePrice", "Trade Price")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.currentStock")}*</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.lowStockThreshold")}*</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("products.unit")}*</FormLabel>
                    <FormControl>
                      <Input placeholder="pcs, kg, ltr..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hasExpiry"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t("products.hasExpiry") || "Has Expiry Date"}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("hasExpiry") && (
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("products.expiryDate") || "Expiry Date"}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("products.productImage")}</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
