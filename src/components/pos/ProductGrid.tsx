import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, ScanBarcode, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface ProductGridProps {
  products: any[];
  categories: any[];
  onProductClick: (product: any) => void;
  onLongPress?: (product: any) => void;
}

export default function ProductGrid({ products, categories, onProductClick, onLongPress }: ProductGridProps) {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price: number) => {
    const formatted = Math.round(price).toLocaleString("en-BD");
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  const formatStock = (stock: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(stock) : stock;
  };

  const handleTouchStart = useCallback((product: any) => {
    const timer = setTimeout(() => {
      if (onLongPress) {
        onLongPress(product);
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 500);
    setLongPressTimer(timer);
  }, [onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const handleClick = useCallback((product: any) => {
    onProductClick(product);
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [onProductClick]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sticky Header with Glassmorphism */}
      <div className="sticky top-0 z-10 bg-slate-800/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 space-y-3">
        {/* Smart Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder={t("pos.searchProducts")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-12 h-12 text-base rounded-xl",
              "bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400",
              "focus:bg-slate-700/80 focus:border-indigo-500/50 focus:ring-indigo-500/20",
              "transition-all duration-200"
            )}
          />
        </div>

        {/* Category Pills - Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "h-9 px-5 rounded-full shrink-0 text-sm font-semibold transition-all duration-200",
              selectedCategory === null
                ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/30"
                : "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-700 hover:text-white"
            )}
          >
            {t("common.all")}
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "h-9 px-5 rounded-full shrink-0 text-sm font-semibold transition-all duration-200",
                selectedCategory === category.id
                  ? "shadow-lg"
                  : "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
              style={{
                backgroundColor: selectedCategory === category.id ? category.color : undefined,
                borderColor: selectedCategory === category.id ? category.color : undefined,
                boxShadow: selectedCategory === category.id ? `0 4px 14px ${category.color}40` : undefined
              }}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Bento Product Grid */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map(product => {
            const isOutOfStock = (product.current_stock ?? 0) <= 0;

            return (
              <button
                key={product.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl",
                  "bg-slate-800/80 border border-slate-700/50",
                  "transition-all duration-200 ease-out",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
                  "touch-manipulation",
                  isOutOfStock
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:scale-[1.02] hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-[0.98]"
                )}
                onClick={() => handleClick(product)}
                onTouchStart={() => handleTouchStart(product)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                {/* Image Section (70% of card) */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-700/80 to-slate-800/80">
                  {/* Fallback icon - always visible behind image */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-600/50 to-slate-700/50">
                    <Package className="h-16 w-16 text-slate-500" />
                  </div>
                  {/* Product image - overlays the fallback when loaded */}
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={cn(
                        "absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-300 bg-gradient-to-br from-slate-700/80 to-slate-800/80",
                        !isOutOfStock && "group-hover:scale-110",
                        isOutOfStock && "grayscale opacity-60"
                      )}
                      onLoad={(e) => {
                        console.log('[ProductGrid] Image loaded:', product.name);
                        (e.target as HTMLImageElement).style.opacity = '1';
                      }}
                      onError={(e) => {
                        console.error('[ProductGrid] Image failed:', product.name, product.image_url);
                        // Hide the broken image, let fallback show through
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}

                  {/* Stock Badge - Top Right */}
                  <Badge
                    className={cn(
                      "absolute top-2 right-2 text-xs font-bold px-2 py-0.5",
                      isOutOfStock
                        ? "bg-red-600 text-white"
                        : product.current_stock < (product.low_stock_threshold || 10)
                          ? "bg-red-500/90 text-white"
                          : "bg-black/60 text-white backdrop-blur-sm"
                    )}
                  >
                    {isOutOfStock
                      ? (i18n.language === "bn" ? "স্টক নেই" : "Out")
                      : formatStock(product.current_stock)
                    }
                  </Badge>

                  {/* Out of Stock Overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                      <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {i18n.language === "bn" ? "স্টক শেষ" : "OUT OF STOCK"}
                      </span>
                    </div>
                  )}

                  {/* Hover overlay */}
                  {!isOutOfStock && (
                    <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  )}
                </div>

                {/* Info Section (30% of card) */}
                <div className="p-3 space-y-1">
                  <h3 className={cn(
                    "font-medium text-sm line-clamp-1",
                    isOutOfStock ? "text-slate-400" : "text-white"
                  )}>
                    {product.name}
                  </h3>
                  <p className={cn(
                    "text-lg font-bold",
                    isOutOfStock ? "text-slate-500" : "text-indigo-400"
                  )}>
                    {formatPrice(product.selling_price)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Package className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">{t("pos.noProducts")}</p>
            <p className="text-sm mt-1">{t("pos.trySearching")}</p>
          </div>
        )}
      </ScrollArea>

      {/* Floating Barcode Scanner - Mobile Only */}
      <Button
        size="icon"
        className={cn(
          "fixed bottom-28 right-4 h-14 w-14 rounded-full md:hidden z-30",
          "bg-gradient-to-r from-purple-500 to-purple-600",
          "hover:from-purple-600 hover:to-purple-700",
          "shadow-xl shadow-purple-500/40"
        )}
        onClick={() => {
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }}
      >
        <ScanBarcode className="h-6 w-6 text-white" />
      </Button>
    </div>
  );
}
