import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface MobileCartBarProps {
  itemCount: number;
  total: number;
  onOpenCart: () => void;
}

export function MobileCartBar({ itemCount, total, onOpenCart }: MobileCartBarProps) {
  const { t, i18n } = useTranslation();

  const formatPrice = (price: number) => {
    const formatted = price.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  const formatCount = (count: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(count) : count;
  };

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 p-3 md:hidden safe-area-bottom">
      <Button 
        onClick={onOpenCart}
        className="w-full h-14 text-base font-semibold rounded-xl shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-between px-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 bg-primary-foreground text-primary text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {formatCount(itemCount)}
            </span>
          </div>
          <span>{formatCount(itemCount)}{i18n.language === "bn" ? "টি" : " items"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{formatPrice(total)}</span>
          <span>→</span>
          <span>{t("pos.payment")}</span>
        </div>
      </Button>
    </div>
  );
}
