import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface MobileCartBarProps {
  itemCount: number;
  total: number;
  onCheckout: () => void;
  onViewCart: () => void;
}

export function MobileCartBar({ itemCount, total, onCheckout, onViewCart }: MobileCartBarProps) {
  const { i18n } = useTranslation();

  const formatPrice = (price: number) => {
    const formatted = price.toFixed(0);
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  const formatCount = (count: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(count) : count;
  };

  if (itemCount === 0) return null;

  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-background border-t border-border shadow-lg">
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={onViewCart}
          className="flex items-center gap-2 flex-1 px-4 py-3 bg-muted rounded-lg"
        >
          <ShoppingCart className="h-5 w-5" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">
              {i18n.language === "bn" ? `${formatCount(itemCount)}টি আইটেম` : `${formatCount(itemCount)} items`}
            </div>
            <div className="text-lg font-bold text-primary">
              {i18n.language === "bn" ? `মোট ${formatPrice(total)}` : `Total ${formatPrice(total)}`}
            </div>
          </div>
        </button>
        
        <Button
          onClick={onCheckout}
          size="lg"
          className="h-[60px] px-8 text-lg font-bold bg-success hover:bg-success/90"
        >
          {i18n.language === "bn" ? "পেমেন্ট" : "Checkout"}
        </Button>
      </div>
    </div>
  );
}
