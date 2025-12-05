import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Minus, Plus, Trash2, CreditCard, Banknote, Smartphone, Receipt, User, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  current_stock: number;
}

interface MobilePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onUpdateQty: (productId: string, newQty: number) => void;
  customers: any[];
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  subtotal: number;
  discount: number;
  onDiscountChange: (discount: number) => void;
  tax: number;
  total: number;
  onPayment: (method: string) => void;
  processing: boolean;
}

export function MobilePaymentModal({
  open,
  onOpenChange,
  items,
  onUpdateQty,
  customers,
  selectedCustomer,
  onSelectCustomer,
  subtotal,
  discount,
  onDiscountChange,
  tax,
  total,
  onPayment,
  processing,
}: MobilePaymentModalProps) {
  const { t, i18n } = useTranslation();
  const [showSuccess, setShowSuccess] = useState(false);

  const formatPrice = (price: number) => {
    const formatted = price.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  const formatQty = (qty: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(qty) : qty;
  };

  const handlePayment = async (method: string) => {
    await onPayment(method);
    setShowSuccess(true);
    // Vibrate on success (mobile only)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    setTimeout(() => {
      setShowSuccess(false);
      onOpenChange(false);
    }, 2000);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full h-full max-h-full sm:max-w-lg sm:h-auto sm:max-h-[90vh] p-0 gap-0">
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-success text-success-foreground p-8">
            <div className="rounded-full bg-success-foreground/20 p-6 mb-6">
              <Check className="h-16 w-16" />
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {i18n.language === "bn" ? "পেমেন্ট সফল!" : "Payment Successful!"}
            </h2>
            <p className="text-xl opacity-90">
              {i18n.language === "bn" ? "ধন্যবাদ ❤️" : "Thank you ❤️"}
            </p>
            <p className="text-4xl font-bold mt-6">{formatPrice(total)}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-full max-h-full sm:max-w-lg sm:h-auto sm:max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {t("pos.checkout")}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {/* Cart Items */}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.price)} × {formatQty(item.quantity)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-lg"
                      onClick={() => onUpdateQty(item.product_id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <span className="w-10 text-center font-bold text-lg">
                      {formatQty(item.quantity)}
                    </span>
                    
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-lg"
                      onClick={() => onUpdateQty(item.product_id, item.quantity + 1)}
                      disabled={item.quantity >= item.current_stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-lg text-destructive"
                      onClick={() => onUpdateQty(item.product_id, 0)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

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
                    const customer = customers.find((c) => c.id === value);
                    onSelectCustomer(customer);
                  }
                }}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder={t("pos.selectCustomer")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">{t("pos.walkIn")}</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone && `(${customer.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discount */}
            <div>
              <Label className="mb-2 block">{t("pos.discount")}</Label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => onDiscountChange(Number(e.target.value))}
                className="h-12 text-base text-right"
                placeholder="0"
              />
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">{t("pos.subtotal")}</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-base text-success">
                  <span>{t("pos.discount")}</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">{t("pos.tax")} (5%)</span>
                <span className="font-medium">{formatPrice(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-2xl font-bold">
                <span>{t("pos.total")}</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Payment Buttons */}
        <div className="p-4 border-t bg-muted/50 shrink-0 safe-area-bottom">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handlePayment("cash")}
              disabled={items.length === 0 || processing}
              className="h-16 text-base font-semibold rounded-xl bg-success hover:bg-success/90"
            >
              <div className="flex flex-col items-center gap-1">
                <Banknote className="h-6 w-6" />
                <span>{t("pos.cash")}</span>
              </div>
            </Button>

            <Button
              onClick={() => handlePayment("card")}
              disabled={items.length === 0 || processing}
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
              disabled={items.length === 0 || processing}
              className="h-16 text-base font-semibold rounded-xl bg-accent hover:bg-accent/90"
            >
              <div className="flex flex-col items-center gap-1">
                <Smartphone className="h-6 w-6" />
                <span>{i18n.language === "bn" ? "বিকাশ" : "bKash"}</span>
              </div>
            </Button>

            <Button
              onClick={() => handlePayment("credit")}
              disabled={items.length === 0 || processing}
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
      </DialogContent>
    </Dialog>
  );
}
