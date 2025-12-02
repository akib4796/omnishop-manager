import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface MobileCartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: any[];
  onUpdateQty: (productId: string, newQty: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function MobileCartDrawer({ 
  open, 
  onClose, 
  items, 
  onUpdateQty, 
  notes, 
  onNotesChange 
}: MobileCartDrawerProps) {
  const { t, i18n } = useTranslation();

  const formatPrice = (price: number) => {
    const formatted = price.toFixed(2);
    return i18n.language === "bn" ? `৳ ${toBengaliNumerals(formatted)}` : `৳ ${formatted}`;
  };

  const formatQty = (qty: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(qty) : qty;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">
              {t("pos.cart")} ({formatQty(items.length)})
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(80vh-140px)]">
          <div className="p-4 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-lg">{t("pos.emptyCart")}</p>
                <p className="text-sm mt-2">{t("pos.addItems")}</p>
              </div>
            ) : (
              items.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-base truncate">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.price)} × {formatQty(item.quantity)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
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
                      className="h-10 w-10"
                      onClick={() => onUpdateQty(item.product_id, item.quantity + 1)}
                      disabled={item.quantity >= item.current_stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 text-destructive"
                      onClick={() => onUpdateQty(item.product_id, 0)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-right font-bold text-lg">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <Textarea
            placeholder={t("pos.addNote")}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="resize-none text-base min-h-[80px]"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
