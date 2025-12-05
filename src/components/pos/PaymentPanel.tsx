import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Banknote, Smartphone, Receipt, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { savePendingSale } from "@/lib/offline-db";
import { syncManager } from "@/lib/sync-manager";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface PaymentPanelProps {
  customers: any[];
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  subtotal: number;
  discount: number;
  onDiscountChange: (discount: number) => void;
  tax: number;
  total: number;
  cart: any[];
  notes: string;
  isOnline: boolean;
  onSaleComplete: () => void;
  onLoadPendingSales: () => void;
}

export default function PaymentPanel({
  customers,
  selectedCustomer,
  onSelectCustomer,
  subtotal,
  discount,
  onDiscountChange,
  tax,
  total,
  cart,
  notes,
  isOnline,
  onSaleComplete,
  onLoadPendingSales,
}: PaymentPanelProps) {
  const { t, i18n } = useTranslation();
  const [processing, setProcessing] = useState(false);

  const formatPrice = (price: number) => {
    const formatted = Math.round(price).toLocaleString("en-BD");
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  const handlePayment = async (paymentMethod: string) => {
    if (cart.length === 0) return;
    if (processing) return;

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const saleData = {
        tenant_id: profile.tenant_id,
        customer_id: selectedCustomer?.id || null,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        discount,
        tax,
        total,
        payment_method: paymentMethod,
        notes,
        cashier_id: user.id,
        completed_at: new Date().toISOString(),
      };

      if (isOnline) {
        const saleId = crypto.randomUUID();
        
        const { error } = await supabase
          .from('pending_sales')
          .insert({
            id: saleId,
            tenant_id: profile.tenant_id,
            sale_data: saleData,
            synced: true,
            synced_at: new Date().toISOString(),
          });

        if (error) throw error;

        for (const item of cart) {
          const { data: product } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({ current_stock: product.current_stock - item.quantity })
              .eq('id', item.product_id);
          }
        }

        // Vibrate on success
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        toast.success(t("pos.saleCompleted"));
      } else {
        const saleId = crypto.randomUUID();
        
        await savePendingSale({
          id: saleId,
          tenant_id: profile.tenant_id,
          sale_data: saleData,
          created_at: new Date().toISOString(),
        });

        for (const item of cart) {
          await syncManager.decrementStockLocally(item.product_id, item.quantity);
        }

        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        toast.success(t("pos.offlineSale"));
        toast.info(t("pos.willSyncLater"));
        
        await onLoadPendingSales();
      }

      onSaleComplete();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Error processing payment");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="flex flex-col h-full rounded-xl">
      <div className="p-4 space-y-4">
        {/* Customer Selection */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4" />
            {t("pos.customer")}
          </Label>
          <Select
            value={selectedCustomer?.id || "walk-in"}
            onValueChange={(value) => {
              if (value === "walk-in") {
                onSelectCustomer(null);
              } else {
                const customer = customers.find(c => c.id === value);
                onSelectCustomer(customer);
              }
            }}
          >
            <SelectTrigger className="h-12 text-base rounded-lg">
              <SelectValue placeholder={t("pos.selectCustomer")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">{t("pos.walkIn")}</SelectItem>
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name} {customer.phone && `(${customer.phone})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-3">
          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">{t("pos.subtotal")}</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <Label htmlFor="discount">{t("pos.discount")}</Label>
            <Input
              id="discount"
              type="number"
              value={discount}
              onChange={(e) => onDiscountChange(Number(e.target.value))}
              className="w-28 text-right h-10 rounded-lg"
            />
          </div>

          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">{t("pos.tax")} (5%)</span>
            <span className="font-medium">{formatPrice(tax)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-xl font-bold">
            <span>{t("pos.total")}</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
        </div>

        <Separator />

        {/* Payment Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => handlePayment("cash")}
            disabled={cart.length === 0 || processing}
            className="h-16 text-base font-semibold rounded-xl bg-success hover:bg-success/90"
          >
            <div className="flex flex-col items-center gap-1">
              <Banknote className="h-6 w-6" />
              <span>{t("pos.cash")}</span>
            </div>
          </Button>

          <Button
            onClick={() => handlePayment("card")}
            disabled={cart.length === 0 || processing}
            className="h-16 text-base font-semibold rounded-xl"
            variant="secondary"
          >
            <div className="flex flex-col items-center gap-1">
              <CreditCard className="h-6 w-6" />
              <span>{t("pos.card")}</span>
            </div>
          </Button>

          <Button
            onClick={() => handlePayment("mobile")}
            disabled={cart.length === 0 || processing}
            className="h-16 text-base font-semibold rounded-xl bg-accent hover:bg-accent/90"
          >
            <div className="flex flex-col items-center gap-1">
              <Smartphone className="h-6 w-6" />
              <span>{i18n.language === "bn" ? "বিকাশ" : "bKash"}</span>
            </div>
          </Button>

          <Button
            onClick={() => handlePayment("credit")}
            disabled={cart.length === 0 || processing}
            className="h-16 text-base font-semibold rounded-xl"
            variant="outline"
          >
            <div className="flex flex-col items-center gap-1">
              <Receipt className="h-6 w-6" />
              <span>{t("pos.credit")}</span>
            </div>
          </Button>
        </div>
      </div>
    </Card>
  );
}
