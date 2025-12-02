import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface ProductGridProps {
  products: any[];
  categories: any[];
  onProductClick: (product: any) => void;
}

export default function ProductGrid({ products, categories, onProductClick }: ProductGridProps) {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price: number) => {
    const formatted = price.toFixed(2);
    return i18n.language === "bn" ? `৳ ${toBengaliNumerals(formatted)}` : `৳ ${formatted}`;
  };

  const formatStock = (stock: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(stock) : stock;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t("pos.searchProducts")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 text-base"
          />
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="lg"
              onClick={() => setSelectedCategory(null)}
              className="whitespace-nowrap h-12"
            >
              {t("common.all")}
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="lg"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap h-12"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4 md:pb-4 pb-24">
          {filteredProducts.map(product => (
            <Card
              key={product.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow active:scale-95"
              onClick={() => onProductClick(product)}
            >
              <div className="space-y-2">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-medium text-base line-clamp-2 min-h-[48px]">{product.name}</h3>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(product.selling_price)}
                    </span>
                    <Badge
                      variant={product.current_stock < (product.low_stock_threshold || 10) ? "destructive" : "secondary"}
                      className="text-sm px-2 py-1"
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
    </div>
  );
}
