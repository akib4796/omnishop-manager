import { useTranslation } from "react-i18next";
import { CreditCard, Banknote, Smartphone, Receipt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface MobilePaymentModalProps {
  open: boolean;
  onClose: () => void;
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
  onClose,
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

  const formatPrice = (price: number) => {
    const formatted = price.toFixed(2);
    return i18n.language === "bn" ? `৳ ${toBengaliNumerals(formatted)}` : `৳ ${formatted}`;
  };

  const paymentMethods = [
    { id: "cash", icon: Banknote, label: i18n.language === "bn" ? "নগদ" : "Cash", color: "bg-success" },
    { id: "card", icon: CreditCard, label: i18n.language === "bn" ? "কার্ড" : "Card", color: "bg-primary" },
    { id: "mobile", icon: Smartphone, label: i18n.language === "bn" ? "বিকাশ/নগদ" : "bKash/Nagad", color: "bg-pink-500" },
    { id: "credit", icon: Receipt, label: i18n.language === "bn" ? "ক্রেডিট" : "Credit", color: "bg-orange-500" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-full m-0 p-0 rounded-none md:max-w-md md:h-auto md:rounded-lg">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {i18n.language === "bn" ? "পেমেন্ট" : "Payment"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Customer Selection */}
          <div>
            <Label className="text-base">{t("pos.customer")}</Label>
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
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder={t("pos.selectCustomer")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">{t("pos.walkIn")}</SelectItem>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Totals */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-base">
              <span>{t("pos.subtotal")}</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <Label htmlFor="discount" className="text-base">{t("pos.discount")}</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => onDiscountChange(Number(e.target.value))}
                className="w-32 h-12 text-right text-base"
              />
            </div>

            <div className="flex justify-between text-base">
              <span>{t("pos.tax")}</span>
              <span className="font-medium">{formatPrice(tax)}</span>
            </div>

            <div className="flex justify-between text-2xl font-bold pt-2 border-t">
              <span>{t("pos.total")}</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label className="text-base">
              {i18n.language === "bn" ? "পেমেন্ট পদ্ধতি" : "Payment Method"}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  onClick={() => onPayment(method.id)}
                  disabled={processing}
                  className={`h-24 flex-col gap-2 text-white ${method.color} hover:opacity-90`}
                  size="lg"
                >
                  <method.icon className="h-8 w-8" />
                  <span className="text-base font-bold">{method.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
