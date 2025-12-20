import { useTranslation } from "react-i18next";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";

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
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40 md:hidden",
      "px-4 pb-6 pt-3",
      "bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent"
    )}>
      <Button
        onClick={onOpenCart}
        className={cn(
          "w-full h-16 text-base font-bold rounded-2xl",
          "bg-gradient-to-r from-indigo-500 to-purple-600",
          "hover:from-indigo-600 hover:to-purple-700",
          "shadow-xl shadow-indigo-500/30",
          "flex items-center justify-between px-5",
          "transition-all duration-200 active:scale-[0.98]"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 bg-white text-indigo-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow">
              {formatCount(itemCount)}
            </span>
          </div>
          <span className="text-white/90">
            {formatCount(itemCount)}{i18n.language === "bn" ? "টি আইটেম" : " items"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">{formatPrice(total)}</span>
          <ChevronRight className="h-5 w-5" />
        </div>
      </Button>
    </div>
  );
}
