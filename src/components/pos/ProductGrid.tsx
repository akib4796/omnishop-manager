import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, ScanBarcode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
        // Vibrate on long press
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
    // Quick tap adds 1 qty instantly
    onProductClick(product);
    // Subtle vibration feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [onProductClick]);

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="mb-3 md:mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("pos.searchProducts")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base rounded-xl"
          />
        </div>

        {/* Category Chips - Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="h-10 px-4 rounded-full shrink-0 text-sm font-medium"
          >
            {t("common.all")}
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="h-10 px-4 rounded-full shrink-0 text-sm font-medium"
              style={{
                backgroundColor: selectedCategory === category.id ? category.color : undefined,
                borderColor: category.color,
              }}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <ScrollArea className="flex-1 -mx-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 px-1 pb-4">
          {filteredProducts.map(product => (
            <Card
              key={product.id}
              className={cn(
                "p-2 md:p-3 cursor-pointer transition-all duration-200 rounded-xl",
                "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                "touch-manipulation select-none"
              )}
              onClick={() => handleClick(product)}
              onTouchStart={() => handleTouchStart(product)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div className="space-y-2">
                {product.image_url ? (
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-3xl md:text-4xl">📦</span>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between mt-2 gap-1">
                    <span className="text-base md:text-lg font-bold text-primary">
                      {formatPrice(product.selling_price)}
                    </span>
                    <Badge
                      variant={product.current_stock < (product.low_stock_threshold || 10) ? "destructive" : "secondary"}
                      className="text-xs px-2 py-0.5 rounded-full"
                    >
                      {formatStock(product.current_stock)}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Floating Barcode Scanner Button - Mobile Only */}
      <Button
        size="icon"
        className="fixed bottom-32 right-4 h-14 w-14 rounded-full shadow-lg bg-destructive hover:bg-destructive/90 md:hidden z-30"
        onClick={() => {
          // Barcode scanner functionality
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }}
      >
        <ScanBarcode className="h-6 w-6" />
      </Button>
    </div>
  );
}
