import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getProducts, createProduct } from "@/integrations/appwrite/products";
import {
  getSuppliers,
  createPurchaseOrder,
  PurchaseOrder
} from "@/integrations/appwrite/inventory";

const orderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        productName: z.string().min(1, "Product name is required"),
        quantity: z.string().min(1, "Quantity is required"),
        unitPrice: z.string().min(1, "Cost price is required"),
        isNew: z.boolean().optional(),
      })
    )
    .min(1, "At least one item is required"),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: PurchaseOrder | null;
}

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  order,
}: PurchaseOrderDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenantId;

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getSuppliers(tenantId);
    },
    enabled: !!tenantId,
  });

  const { data: products } = useQuery({
    queryKey: ["products", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getProducts(tenantId);
    },
    enabled: !!tenantId,
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      supplierId: "",
      items: [{ productId: "", productName: "", quantity: "1", unitPrice: "0", isNew: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (order) {
      form.reset({
        supplierId: order.supplierId || "",
        items: order.items?.map((item) => ({
          productId: item.productId,
          productName: item.productName || "",
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          isNew: false,
        })) || [{ productId: "", productName: "", quantity: "1", unitPrice: "0", isNew: true }],
      });
    } else {
      form.reset({
        supplierId: "",
        items: [{ productId: "", productName: "", quantity: "1", unitPrice: "0", isNew: true }],
      });
    }
  }, [order, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      if (!tenantId || !user) throw new Error("Not authenticated");

      const totalAmount = data.items.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * parseInt(item.quantity),
        0
      );

      // Process items - create new products if needed
      const processedItems = await Promise.all(
        data.items.map(async (item) => {
          let productId = item.productId;
          let productName = item.productName;

          // If it's a new product (no productId OR isNew flag true), select/create it
          // NOTE: If user selected existing product, productId will be set and isNew should be false
          if ((!productId || item.isNew) && item.productName) {
            try {
              // Double check if name matches an existing product to avoid duplicates
              const existing = products?.find(
                p => p.name.toLowerCase() === item.productName.toLowerCase()
              );

              if (existing) {
                productId = existing.$id;
                productName = existing.name;
              } else {
                const newProduct = await createProduct({
                  name: item.productName,
                  sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  purchasePrice: parseFloat(item.unitPrice),
                  sellingPrice: parseFloat(item.unitPrice) * 1.2,
                  currentStock: 0,
                  lowStockThreshold: 5,
                  unit: "pcs",
                  tenantId,
                });
                productId = newProduct.$id;
                productName = newProduct.name;
                toast.success(`Product "${item.productName}" created`);
              }
            } catch (error) {
              console.error("Error creating product:", error);
            }
          }

          return {
            productId: productId || `temp-${Date.now()}`,
            productName,
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
          };
        })
      );

      return createPurchaseOrder({
        supplierId: data.supplierId,
        items: processedItems,
        totalAmount,
        tenantId,
        createdBy: user.$id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["products", tenantId] });
      toast.success(
        order ? t("inventory.poUpdated") : t("inventory.poCreated")
      );
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("PO Error:", error);
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
              name="supplierId"
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
                        <SelectItem key={supplier.$id} value={supplier.$id}>
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
                    append({ productId: "", productName: "", quantity: "1", unitPrice: "0", isNew: true })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("common.add")}
                </Button>
              </div>

              {fields.map((field, index) => (
                <PurchaseOrderItemRow
                  key={field.id}
                  index={index}
                  form={form}
                  remove={remove}
                  products={products || []}
                  isFirst={fields.length === 1}
                  t={t}
                />
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
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Separated component for performance and cleaner logic
function PurchaseOrderItemRow({ index, form, remove, products, isFirst, t }: any) {
  const [open, setOpen] = useState(false); // Controls popover state

  // Watch values for conditional rendering/styling
  const productId = form.watch(`items.${index}.productId`);
  const productName = form.watch(`items.${index}.productName`);
  const isNew = form.watch(`items.${index}.isNew`);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="grid grid-cols-12 gap-4 items-end">
        {/* Product Selection Combobox */}
        <div className="col-span-12 md:col-span-5">
          <FormField
            control={form.control}
            name={`items.${index}.productName`}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("inventory.product")}</FormLabel>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value || "Select or type product..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search product..." />
                      <CommandList>
                        <CommandEmpty>
                          <div
                            className="p-2 text-sm text-center cursor-pointer hover:bg-accent rounded-sm"
                            onClick={() => {
                              // Create new optional logic can be here, 
                              // OR we can just instruct user to close and type.
                              // Better: Use the CommandInput value? 
                              // Command doesn't easily expose input value in Empty state usually without state.
                              // Workaround: We encourage selecting existing. 
                              // If they want new, they can just type text in the field? 
                              // Ah, Comboxbox Trigger IS a button, so they can't type directly into it.
                              // We need a way to capture the "Create new" intent.
                            }}
                          >
                            No product found.
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {/* Add "Create New" option at the top if input matches nothing? 
                               Actually, to support "Enter product name", we might want a different UX 
                               if we use standard Combobox (Button trigger).
                               
                               Alternative: The CommandInput IS the input. 
                               But typical shadcn combobox keeps input inside popover.
                               
                               Let's allow users to "Create: <SearchTerm>"
                           */}
                          {products.map((product: any) => (
                            <CommandItem
                              value={product.name}
                              key={product.$id}
                              onSelect={() => {
                                form.setValue(`items.${index}.productId`, product.$id);
                                form.setValue(`items.${index}.productName`, product.name);
                                form.setValue(`items.${index}.unitPrice`, product.purchasePrice.toString());
                                form.setValue(`items.${index}.isNew`, false);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  product.$id === productId
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    {/* Footer for creating new */}
                    <div className="p-2 border-t bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2">Can't find it?</p>
                      <Input
                        placeholder="Type new product name..."
                        className="h-8 text-sm"
                        value={isNew ? productName : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          form.setValue(`items.${index}.productName`, val);
                          form.setValue(`items.${index}.productId`, ""); // Clear ID
                          form.setValue(`items.${index}.isNew`, true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setOpen(false);
                          }
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Quantity */}
        <div className="col-span-6 md:col-span-3">
          <FormField
            control={form.control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qty</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Unit Price */}
        <div className="col-span-5 md:col-span-3">
          <FormField
            control={form.control}
            name={`items.${index}.unitPrice`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common.price")}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Delete Button */}
        <div className="col-span-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            disabled={isFirst}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex gap-2">
        {productId && !isNew && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
            <Check className="h-3 w-3" /> Existing Product
          </span>
        )}
        {isNew && productName && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
            <Plus className="h-3 w-3" /> Creates New Product
          </span>
        )}
      </div>
    </div>
  );
}
