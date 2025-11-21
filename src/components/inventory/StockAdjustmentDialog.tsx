import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

const adjustmentSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  qty_change: z.string().min(1, "Quantity change is required"),
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

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, current_stock, unit")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      product_id: "",
      qty_change: "0",
      reason: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userData.user?.id)
        .single();

      const qtyChange = parseInt(data.qty_change);

      // Create adjustment record
      const { error: adjustmentError } = await supabase
        .from("stock_adjustments")
        .insert({
          tenant_id: profile?.tenant_id,
          product_id: data.product_id,
          qty_change: qtyChange,
          reason: data.reason,
          adjusted_by: userData.user?.id,
        });

      if (adjustmentError) throw adjustmentError;

      // Update product stock
      const { data: product } = await supabase
        .from("products")
        .select("current_stock")
        .eq("id", data.product_id)
        .single();

      if (product) {
        const { error: updateError } = await supabase
          .from("products")
          .update({
            current_stock: product.current_stock + qtyChange,
          })
          .eq("id", data.product_id);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
              name="product_id"
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
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Current: {product.current_stock}{" "}
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
              name="qty_change"
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
