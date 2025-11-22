import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface CartProps {
  items: any[];
  onUpdateQty: (productId: string, newQty: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export default function Cart({ items, onUpdateQty, notes, onNotesChange }: CartProps) {
  const { t, i18n } = useTranslation();

  const formatPrice = (price: number) => {
    const formatted = price.toFixed(2);
    return i18n.language === "bn" ? `৳ ${toBengaliNumerals(formatted)}` : `৳ ${formatted}`;
  };

  const formatQty = (qty: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(qty) : qty;
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <p className="text-lg">{t("pos.emptyCart")}</p>
        <p className="text-sm mt-2">{t("pos.addItems")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {items.map(item => (
            <div key={item.product_id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(item.price)} × {formatQty(item.quantity)}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => onUpdateQty(item.product_id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <span className="w-8 text-center font-medium">
                  {formatQty(item.quantity)}
                </span>
                
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => onUpdateQty(item.product_id, item.quantity + 1)}
                  disabled={item.quantity >= item.current_stock}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onUpdateQty(item.product_id, 0)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="text-right font-bold">
                {formatPrice(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Textarea
          placeholder={t("pos.addNote")}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}
