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
import { account } from "@/integrations/appwrite";
import { getProductById, updateProductStock } from "@/integrations/appwrite/products";
import { createPendingSale, SaleData } from "@/integrations/appwrite/sales";
import { createPayment, getEntityBalance } from "@/integrations/appwrite/payments";
import { savePendingSale } from "@/lib/offline-db";
import { syncManager } from "@/lib/sync-manager";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { useAuth } from "@/hooks/useAuth";

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
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);
  const { profile } = useAuth();
  const tenantId = profile?.tenantId;

  const formatPrice = (price: number) => {
    const formatted = Math.round(price).toLocaleString("en-BD");
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  // Fetch customer balance when selected
  useState(() => {
    if (selectedCustomer?.id && tenantId) {
      getEntityBalance(tenantId, selectedCustomer.id, 'CUSTOMER')
        .then(bal => setCustomerBalance(bal))
        .catch(err => console.error("Failed to fetch balance", err));
    } else {
      setCustomerBalance(null);
    }
  }); // Using effect essentially

  const handlePayment = async (paymentMethod: string) => {
    if (cart.length === 0) return;
    if (processing) return;
    if (!tenantId) {
      toast.error("No tenant found");
      toast.error("No tenant found");
      return;
    }

    // Credit Limit Check
    if (paymentMethod === 'credit' && selectedCustomer?.creditLimit) {
      const currentDebt = customerBalance || 0;
      const newDebt = currentDebt + total;
      const limit = selectedCustomer.creditLimit;

      if (newDebt > limit) {
        toast.error(
          i18n.language === "bn"
            ? `ক্রেডিট লিমিট অতিক্রম করেছে! (বর্তমান: ${limit}, নতুন: ${newDebt})`
            : `Credit limit exceeded! (Limit: ${limit}, New Balance: ${newDebt})`
        );
        return; // Block sale
      }
    }

    setProcessing(true);

    try {
      console.log("[POS] handlePayment started - isOnline:", isOnline, "tenantId:", tenantId);

      const user = await account.get();
      if (!user) throw new Error("Not authenticated");

      const saleData: SaleData = {
        tenantId: tenantId,
        customerId: selectedCustomer?.id || null,
        items: cart.map((item: any) => ({
          productId: item.productId || item.product_id,
          quantity: item.quantity,
          price: item.price,
          costPrice: item.purchasePrice || item.cost_price || 0, // For profit margin
        })),
        subtotal,
        discount,
        tax,
        total,
        paymentMethod: paymentMethod,
        notes,
        cashierId: user.$id,
        completedAt: new Date().toISOString(),
      };

      console.log("[POS] saleData prepared, isOnline:", isOnline);

      if (isOnline) {
        console.log("[POS] Online mode - saving to Appwrite...");

        // Create sale in Appwrite
        await createPendingSale({
          tenantId: tenantId,
          saleData: saleData,
          synced: true,
          syncedAt: new Date().toISOString(),
        });

        console.log("[POS] Sale saved to pending_sales, now recording to ledger...");

        // Record in Ledger (Payments Collection)
        // This ensures Accounting module tracks the revenue/debt
        try {
          // Map POS payment methods to ledger wallet names
          const getWalletMethod = (method: string) => {
            switch (method) {
              case 'cash': return 'Cash';
              case 'card': return 'Bank Transfer';
              case 'mobile': return 'Mobile Money';
              case 'credit': return 'Credit'; // Customer owes - not a wallet
              default: return 'Cash';
            }
          };

          console.log("Recording sale to ledger:", { tenantId, type: 'IN', category: 'SALE', amount: total, method: getWalletMethod(paymentMethod) });

          await createPayment({
            tenantId,
            type: 'IN',
            category: 'SALE',
            entityId: selectedCustomer?.id,
            amount: total,
            method: getWalletMethod(paymentMethod),
          });

          console.log("Successfully recorded sale to ledger!");
        } catch (err: any) {
          console.error("Failed to record ledger entry:", err);
          // Show warning to user but don't block the sale
          toast.warning(`Sale complete but ledger not updated: ${err.message || 'Unknown error'}`);
        }

        // Update product stock on server
        for (const item of cart) {
          const productId = item.productId || item.product_id;
          try {
            const product = await getProductById(productId);
            if (product) {
              await updateProductStock(productId, (product.currentStock || 0) - item.quantity);
            }
          } catch (err) {
            console.error(`Failed to update stock for ${productId}:`, err);
          }
        }

        // Vibrate on success
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        toast.success(t("pos.saleCompleted"));
      } else {
        // Save to local IndexedDB for later sync
        await savePendingSale({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          sale_data: {
            ...saleData,
            items: cart.map((item: any) => ({
              product_id: item.productId || item.product_id,
              quantity: item.quantity,
              price: item.price,
            })),
          },
          created_at: new Date().toISOString(),
        });

        // Update local stock
        for (const item of cart) {
          const productId = item.productId || item.product_id;
          await syncManager.decrementStockLocally(productId, item.quantity);
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
          {customerBalance !== null && (
            <div className="mt-1 text-xs flex justify-between px-1">
              <span className="text-slate-500">
                {t("customers.balance") || "Balance"}:
              </span>
              <span className={customerBalance > 0 ? "text-red-500 font-medium" : "text-green-500"}>
                ৳{customerBalance.toLocaleString()}
              </span>
            </div>
          )}
          {selectedCustomer?.creditLimit > 0 && (
            <div className="text-xs flex justify-between px-1 text-slate-400">
              <span>Credit Limit:</span>
              <span>৳{selectedCustomer.creditLimit.toLocaleString()}</span>
            </div>
          )}
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
      </div >
    </Card >
  );
}
