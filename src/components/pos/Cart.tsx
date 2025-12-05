import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  current_stock: number;
}

interface CartProps {
  items: CartItem[];
  onUpdateQty: (productId: string, newQty: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export default function Cart({ items, onUpdateQty, notes, onNotesChange }: CartProps) {
  const { t, i18n } = useTranslation();

  const formatPrice = (price: number) => {
    const formatted = Math.round(price).toLocaleString("en-BD");
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  const formatQty = (qty: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(qty) : qty;
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">{t("pos.emptyCart")}</p>
        <p className="text-sm mt-1">{t("pos.addItems")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-3 md:p-4 space-y-2">
          {items.map(item => (
            <div 
              key={item.product_id} 
              className={cn(
                "flex items-center gap-2 md:gap-3 p-3 bg-muted rounded-xl",
                "transition-all duration-200"
              )}
            >
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
                  className="h-10 w-10 rounded-lg touch-manipulation"
                  onClick={() => onUpdateQty(item.product_id, item.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <span className="w-8 text-center font-bold text-base">
                  {formatQty(item.quantity)}
                </span>
                
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-lg touch-manipulation"
                  onClick={() => onUpdateQty(item.product_id, item.quantity + 1)}
                  disabled={item.quantity >= item.current_stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-lg text-destructive touch-manipulation"
                  onClick={() => onUpdateQty(item.product_id, 0)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-right font-bold w-20 shrink-0">
                {formatPrice(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 md:p-4 border-t">
        <Textarea
          placeholder={t("pos.addNote")}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="resize-none min-h-[60px] rounded-xl text-base"
          rows={2}
        />
      </div>
    </div>
  );
}
