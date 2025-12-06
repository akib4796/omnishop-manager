import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/appwrite";
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
import { Plus, Trash2 } from "lucide-react";

const orderSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1, "Product is required"),
        qty: z.string().min(1, "Quantity is required"),
        cost_price: z.string().min(1, "Cost price is required"),
      })
    )
    .min(1, "At least one item is required"),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: any;
}

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  order,
}: PurchaseOrderDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, purchase_price")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      supplier_id: "",
      items: [{ product_id: "", qty: "1", cost_price: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (order) {
      form.reset({
        supplier_id: order.supplier_id || "",
        items: order.purchase_order_items?.map((item: any) => ({
          product_id: item.product_id,
          qty: item.qty.toString(),
          cost_price: item.cost_price.toString(),
        })) || [{ product_id: "", qty: "1", cost_price: "0" }],
      });
    } else {
      form.reset({
        supplier_id: "",
        items: [{ product_id: "", qty: "1", cost_price: "0" }],
      });
    }
  }, [order, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userData.user?.id)
        .single();

      const totalAmount = data.items.reduce(
        (sum, item) => sum + parseFloat(item.cost_price) * parseInt(item.qty),
        0
      );

      if (order) {
        // Update existing order
        const { error: orderError } = await supabase
          .from("purchase_orders")
          .update({
            supplier_id: data.supplier_id,
            total_amount: totalAmount,
          })
          .eq("id", order.id);

        if (orderError) throw orderError;

        // Delete old items
        await supabase
          .from("purchase_order_items")
          .delete()
          .eq("purchase_order_id", order.id);

        // Insert new items
        const items = data.items.map((item) => ({
          purchase_order_id: order.id,
          product_id: item.product_id,
          qty: parseInt(item.qty),
          cost_price: parseFloat(item.cost_price),
        }));

        const { error: itemsError } = await supabase
          .from("purchase_order_items")
          .insert(items);

        if (itemsError) throw itemsError;
      } else {
        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from("purchase_orders")
          .insert({
            tenant_id: profile?.tenant_id,
            supplier_id: data.supplier_id,
            status: "pending",
            total_amount: totalAmount,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Insert items
        const items = data.items.map((item) => ({
          purchase_order_id: newOrder.id,
          product_id: item.product_id,
          qty: parseInt(item.qty),
          cost_price: parseFloat(item.cost_price),
        }));

        const { error: itemsError } = await supabase
          .from("purchase_order_items")
          .insert(items);

        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success(
        order ? t("inventory.poUpdated") : t("inventory.poCreated")
      );
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const onSubmit = (data: OrderFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order
              ? t("inventory.editPurchaseOrder")
              : t("inventory.createPurchaseOrder")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("inventory.supplier")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("inventory.selectSupplier")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t("inventory.addItems")}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ product_id: "", qty: "1", cost_price: "0" })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("common.add")}
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-5">
                    <FormField
                      control={form.control}
                      name={`items.${index}.product_id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("inventory.product")}</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              const product = products?.find((p) => p.id === value);
                              if (product) {
                                form.setValue(
                                  `items.${index}.cost_price`,
                                  product.purchase_price.toString()
                                );
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("inventory.selectProduct")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.qty`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("inventory.qtyChange")}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.cost_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("common.price")}</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

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
