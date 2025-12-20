import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { getProducts, updateProductStock } from "@/integrations/appwrite/products";
import { createStockAdjustment } from "@/integrations/appwrite/inventory";

const adjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  qtyChange: z.string().min(1, "Quantity change is required"),
  reason: z.string().min(1, "Reason is required"),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
}: StockAdjustmentDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenantId;

  const { data: products } = useQuery({
    queryKey: ["products", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getProducts(tenantId);
    },
    enabled: !!tenantId,
  });

  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: "",
      qtyChange: "0",
      reason: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) => {
      if (!tenantId || !user) throw new Error("Not authenticated");

      const qtyChange = parseInt(data.qtyChange);

      // Create adjustment record
      await createStockAdjustment({
        productId: data.productId,
        adjustmentType: qtyChange >= 0 ? 'in' : 'out',
        quantity: Math.abs(qtyChange),
        reason: data.reason,
        tenantId,
        createdBy: user.$id,
      });

      // Update product stock
      const product = products?.find(p => p.$id === data.productId);
      if (product) {
        await updateProductStock(data.productId, product.currentStock + qtyChange);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["products", tenantId] });
      toast.success(t("inventory.adjustmentCreated"));
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const onSubmit = (data: AdjustmentFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("inventory.createAdjustment")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inventory.product")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("inventory.selectProduct")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.$id} value={product.$id}>
                          {product.name} (Current: {product.currentStock}{" "}
                          {product.unit})
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
              name="qtyChange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inventory.qtyChange")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Use negative numbers to decrease stock"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inventory.reason")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
