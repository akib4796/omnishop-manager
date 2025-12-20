import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  currentStock: number;
}

interface CartProps {
  items: CartItem[];
  onUpdateQty: (productId: string, newQty: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

interface SwipeState {
  itemId: string | null;
  startX: number;
  currentX: number;
  swiping: boolean;
}

export default function Cart({ items, onUpdateQty, notes, onNotesChange }: CartProps) {
  const { t, i18n } = useTranslation();
  const [swipeState, setSwipeState] = useState<SwipeState>({
    itemId: null,
    startX: 0,
    currentX: 0,
    swiping: false,
  });

  const formatPrice = (price: number) => {
    const formatted = Math.round(price).toLocaleString("en-BD");
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  const formatQty = (qty: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(qty) : qty;
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
    setSwipeState({
      itemId,
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      swiping: true,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeState.swiping) return;
    setSwipeState(prev => ({
      ...prev,
      currentX: e.touches[0].clientX,
    }));
  };

  const handleTouchEnd = (itemId: string) => {
    if (!swipeState.swiping || swipeState.itemId !== itemId) return;

    const swipeDistance = swipeState.startX - swipeState.currentX;
    const threshold = 100; // Pixels to trigger delete

    if (swipeDistance > threshold) {
      // Delete the item
      onUpdateQty(itemId, 0);
    }

    setSwipeState({
      itemId: null,
      startX: 0,
      currentX: 0,
      swiping: false,
    });
  };

  const getSwipeTransform = (itemId: string) => {
    if (swipeState.itemId !== itemId || !swipeState.swiping) return 0;
    const distance = Math.min(150, Math.max(0, swipeState.startX - swipeState.currentX));
    return -distance;
  };

  const getSwipeOpacity = (itemId: string) => {
    if (swipeState.itemId !== itemId || !swipeState.swiping) return 0;
    const distance = Math.min(150, Math.max(0, swipeState.startX - swipeState.currentX));
    return Math.min(1, distance / 80);
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
        <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">{t("pos.emptyCart")}</p>
        <p className="text-sm mt-1 text-gray-600">{t("pos.addItems")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {items.map(item => (
            <div
              key={item.productId}
              className="relative overflow-hidden rounded-xl"
            >
              {/* Delete Background (revealed on swipe) */}
              <div
                className="absolute inset-y-0 right-0 w-24 bg-red-500/90 flex items-center justify-center rounded-r-xl"
                style={{ opacity: getSwipeOpacity(item.productId) }}
              >
                <Trash2 className="h-6 w-6 text-white" />
              </div>

              {/* Swipeable Item */}
              <div
                className={cn(
                  "flex items-center gap-3 p-3 relative",
                  "bg-slate-700/50 border border-slate-600/30",
                  "transition-transform duration-200",
                  !swipeState.swiping && "transition-all"
                )}
                style={{
                  transform: `translateX(${getSwipeTransform(item.productId)}px)`,
                }}
                onTouchStart={(e) => handleTouchStart(e, item.productId)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(item.productId)}
              >
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-white truncate">
                    {item.name}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {formatPrice(item.price)} × {formatQty(item.quantity)}
                  </p>
                </div>

                {/* Quantity Controls - Large Circular Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className={cn(
                      "h-10 w-10 rounded-full",
                      "bg-red-500/10 border-red-500/30 text-red-400",
                      "hover:bg-red-500/20 hover:border-red-500/50",
                      "transition-all duration-200 active:scale-90"
                    )}
                    onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <span className="w-8 text-center font-bold text-base text-white">
                    {formatQty(item.quantity)}
                  </span>

                  <Button
                    size="icon"
                    variant="outline"
                    className={cn(
                      "h-10 w-10 rounded-full",
                      "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
                      "hover:bg-indigo-500/20 hover:border-indigo-500/50",
                      "transition-all duration-200 active:scale-90",
                      "disabled:opacity-50"
                    )}
                    onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.currentStock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 rounded-full ml-1",
                      "text-gray-500 hover:text-red-400 hover:bg-red-500/10",
                      "transition-all duration-200"
                    )}
                    onClick={() => onUpdateQty(item.productId, 0)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Item Total */}
                <div className="text-right font-bold text-indigo-400 w-20 shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Swipe Hint (show on first item only) */}
      {items.length > 0 && (
        <p className="text-xs text-center text-slate-500 pb-1">
          {i18n.language === "bn" ? "← সোয়াইপ করে ডিলিট" : "← Swipe left to delete"}
        </p>
      )}

      {/* Notes Section */}
      <div className="p-3 border-t border-slate-700/50">
        <Textarea
          placeholder={t("pos.addNote")}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className={cn(
            "resize-none min-h-[50px] rounded-xl text-sm",
            "bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400",
            "focus:border-indigo-500/50 focus:ring-indigo-500/20"
          )}
          rows={2}
        />
      </div>
    </div>
  );
}

