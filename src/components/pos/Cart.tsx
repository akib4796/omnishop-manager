import { useTranslation } from "react-i18next";
import { Minus, Plus, X, ShoppingCart } from "lucide-react";
import { toBengaliNumerals } from "@/lib/i18n-utils";

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

export default function Cart({ items, onUpdateQty, notes, onNotesChange }: CartProps) {
  const { t, i18n } = useTranslation();

  const formatPrice = (price: number) => {
    const formatted = Math.round(price).toLocaleString("en-BD");
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  const formatQty = (qty: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(qty) : qty;
  };

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-slate-500">
        <ShoppingCart className="h-6 w-6 mr-2 opacity-30" />
        <span className="text-sm">{t("pos.emptyCart")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Cart Items - Max 3 visible, scroll for more */}
      <div
        className="overflow-y-auto px-2 py-1"
        style={{ maxHeight: '140px' }}
      >
        {items.map(item => (
          <div
            key={item.productId}
            className="flex items-center gap-2 py-1.5 border-b border-slate-700/30 last:border-0"
          >
            {/* Name + Price */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{item.name}</div>
              <div className="text-[10px] text-slate-400">{formatPrice(item.price)}</div>
            </div>

            {/* Qty Controls */}
            <div className="flex items-center gap-1">
              <button
                className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30"
                onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-xs font-bold text-white">{formatQty(item.quantity)}</span>
              <button
                className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/30 disabled:opacity-50"
                onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                disabled={item.quantity >= item.currentStock}
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                className="w-6 h-6 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center"
                onClick={() => onUpdateQty(item.productId, 0)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Total */}
            <div className="text-xs font-bold text-indigo-400 w-14 text-right">
              {formatPrice(item.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
