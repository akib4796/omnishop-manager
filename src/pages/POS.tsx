import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Wifi, WifiOff, ShoppingCart, Clock, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { account } from "@/integrations/appwrite";
import { getProducts, updateProductStock, getProductById, Product } from "@/integrations/appwrite/products";
import { getCategories, Category } from "@/integrations/appwrite/categories";
import { getCustomers, Customer } from "@/integrations/appwrite/customers";
import { createPendingSale, SaleData } from "@/integrations/appwrite/sales";
import { useAuth } from "@/hooks/useAuth";
import { syncManager } from "@/lib/sync-manager";
import { getCachedProducts, getPendingSales, initOfflineDB, savePendingSale } from "@/lib/offline-db";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import ProductGrid from "@/components/pos/ProductGrid";
import Cart from "@/components/pos/Cart";
import PaymentPanel from "@/components/pos/PaymentPanel";
import { MobileCartBar } from "@/components/pos/MobileCartBar";
import { MobilePaymentModal } from "@/components/pos/MobilePaymentModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  currentStock: number;
}

// Convert Product to format expected by ProductGrid (snake_case for offline compatibility)
function productToGridFormat(product: Product) {
  return {
    id: product.$id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    category_id: product.categoryId,
    selling_price: product.sellingPrice,
    current_stock: product.currentStock,
    low_stock_threshold: product.lowStockThreshold,
    image_url: product.imageUrl,
    unit: product.unit,
  };
}

// Convert Category to format expected by ProductGrid
function categoryToGridFormat(category: Category) {
  return {
    id: category.$id,
    name: category.name,
    color: category.color,
  };
}

// Convert Customer to format expected by PaymentPanel
function customerToGridFormat(customer: Customer) {
  return {
    id: customer.$id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
  };
}

export default function POS() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const { profile, loading: authLoading } = useAuth();
  const tenantId = profile?.tenantId;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Initialize offline DB and load data
  useEffect(() => {
    if (authLoading) return;
    if (!tenantId) return;

    initializeData();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success(t("pos.onlineBanner"));
      syncManager.syncAll();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error(t("pos.offlineBanner"));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      syncManager.syncAll();
    }

    const unsubscribe = syncManager.onSyncStatusChange((status, message) => {
      if (status === 'success' && message) {
        const count = parseInt(message.split(' ')[0]);
        toast.success(t("sync.salesSynced", { count }));
        loadPendingSalesCount();
      }
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder*="search"]')?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0) handlePayment("cash");
      } else if (e.key === "F3") {
        e.preventDefault();
        if (cart.length > 0) handlePayment("mobile");
      } else if (e.key === "F4") {
        e.preventDefault();
        holdOrder();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("keydown", handleKeyDown);
      unsubscribe();
    };
  }, [t, cart.length, tenantId, authLoading]);

  async function initializeData() {
    if (!tenantId) return;

    setLoading(true);
    try {
      await initOfflineDB();

      // Load from offline cache first
      const [cachedProducts, cachedCategories, cachedCustomers] = await Promise.all([
        getCachedProducts(),
        import("@/lib/offline-db").then(m => m.getCachedCategories()),
        import("@/lib/offline-db").then(m => m.getCachedCustomers()),
      ]);

      setProducts(cachedProducts);
      setCategories(cachedCategories);
      setCustomers(cachedCustomers);

      // If online, fetch fresh data from Appwrite
      if (navigator.onLine) {
        try {
          const [productsRes, categoriesRes, customersRes] = await Promise.all([
            getProducts(tenantId),
            getCategories(tenantId),
            getCustomers(tenantId),
          ]);

          if (productsRes) setProducts(productsRes.map(productToGridFormat));
          if (categoriesRes) setCategories(categoriesRes.map(categoryToGridFormat));
          if (customersRes) setCustomers(customersRes.map(customerToGridFormat));
        } catch (error) {
          console.error("Error fetching from Appwrite:", error);
          // Fall back to cached data
        }
      }

      await loadPendingSalesCount();
    } catch (error) {
      console.error("Error initializing POS:", error);
      toast.error("Error loading POS data");
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingSalesCount() {
    const pending = await getPendingSales();
    setPendingSalesCount(pending.length);
  }

  const addToCart = useCallback((product: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, {
          productId: product.id,
          name: product.name,
          price: product.selling_price,
          quantity: 1,
          currentStock: product.current_stock,
        }];
      }
    });
    toast.success(t("pos.itemAdded"), { duration: 1000 });
  }, [t]);

  const updateCartItemQty = useCallback((productId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    } else {
      setCart(prevCart => prevCart.map(item =>
        item.productId === productId ? { ...item, quantity: newQty } : item
      ));
    }
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setNotes("");
  }, []);

  const holdOrder = useCallback(() => {
    if (cart.length === 0) return;

    setHeldOrders(prev => [...prev, {
      id: Date.now().toString(),
      cart: [...cart],
      customer: selectedCustomer,
      discount,
      notes,
      timestamp: new Date(),
    }]);

    clearCart();
    toast.success(t("pos.orderHeld"));
  }, [cart, selectedCustomer, discount, notes, clearCart, t]);

  const resumeOrder = useCallback((order: any) => {
    setCart(order.cart);
    setSelectedCustomer(order.customer);
    setDiscount(order.discount);
    setNotes(order.notes);
    setHeldOrders(prev => prev.filter(o => o.id !== order.id));
  }, []);

  const handlePayment = async (paymentMethod: string) => {
    if (cart.length === 0 || processing || !tenantId) return;

    setProcessing(true);

    try {
      const user = await account.get();
      if (!user) throw new Error("Not authenticated");

      const saleData: SaleData = {
        tenantId: tenantId,
        customerId: selectedCustomer?.id || null,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        discount,
        tax: taxAmount,
        total,
        paymentMethod: paymentMethod,
        notes,
        cashierId: user.$id,
        completedAt: new Date().toISOString(),
      };

      if (isOnline) {
        // Create sale in Appwrite
        await createPendingSale({
          tenantId: tenantId,
          saleData: saleData,
          synced: true,
          syncedAt: new Date().toISOString(),
        });

        // Update product stock on server
        for (const item of cart) {
          try {
            const product = await getProductById(item.productId);
            if (product) {
              await updateProductStock(item.productId, (product.currentStock || 0) - item.quantity);
            }
          } catch (err) {
            console.error(`Failed to update stock for ${item.productId}:`, err);
          }
        }

        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        toast.success(t("pos.saleCompleted"));
      } else {
        // Save to local IndexedDB for later sync
        await savePendingSale({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          sale_data: {
            ...saleData,
            items: cart.map(item => ({
              product_id: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
          created_at: new Date().toISOString(),
        });

        // Update local stock
        for (const item of cart) {
          await syncManager.decrementStockLocally(item.productId, item.quantity);
        }

        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        toast.success(t("pos.offlineSale"));
        toast.info(t("pos.willSyncLater"));

        await loadPendingSalesCount();
      }

      clearCart();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Error processing payment");
    } finally {
      setProcessing(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = subtotal * 0.05;
  const total = subtotal + taxAmount - discount;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatCount = (count: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(count) : count;
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          <p className="text-lg text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No tenant found. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Online/Offline Banner */}
      <div className={cn(
        "px-4 py-2 text-center text-sm font-medium shrink-0",
        isOnline
          ? "bg-success text-success-foreground"
          : "bg-destructive text-destructive-foreground"
      )}>
        {isOnline ? (
          <div className="flex items-center justify-center gap-2">
            <Wifi className="h-4 w-4" />
            <span>{t("pos.onlineBanner")}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>{t("pos.offlineBanner")}</span>
            {pendingSalesCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {formatCount(pendingSalesCount)} {i18n.language === "bn" ? "পেন্ডিং" : "pending"}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Main POS Layout */}
      <div className={cn(
        "flex-1 overflow-hidden",
        // Mobile: single column
        "flex flex-col",
        // Tablet: 2 columns
        "md:grid md:grid-cols-2 md:gap-4 md:p-4",
        // Desktop: 3 columns
        "lg:grid-cols-12"
      )}>
        {/* Products Grid */}
        <div className={cn(
          "flex-1 overflow-hidden p-3 md:p-0",
          "md:col-span-1",
          "lg:col-span-5",
          // On mobile, add bottom padding for cart bar
          "pb-32 md:pb-0"
        )}>
          <ProductGrid
            products={products}
            categories={categories}
            onProductClick={addToCart}
          />
        </div>

        {/* Cart - Hidden on Mobile (shown in modal) */}
        <Card className={cn(
          "hidden md:flex md:flex-col overflow-hidden rounded-xl",
          "lg:col-span-4"
        )}>
          <div className="p-3 md:p-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-lg font-semibold">{t("pos.cart")}</h2>
              {cart.length > 0 && (
                <Badge variant="secondary">{formatCount(itemCount)}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {heldOrders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    if (heldOrders.length > 0) {
                      resumeOrder(heldOrders[heldOrders.length - 1]);
                    }
                  }}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {formatCount(heldOrders.length)}
                </Button>
              )}
            </div>
          </div>

          <Cart
            items={cart}
            onUpdateQty={updateCartItemQty}
            notes={notes}
            onNotesChange={setNotes}
          />

          <div className="p-3 md:p-4 border-t shrink-0">
            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium rounded-xl bg-warning/10 border-warning text-warning hover:bg-warning/20"
              onClick={holdOrder}
              disabled={cart.length === 0}
            >
              <Pause className="h-5 w-5 mr-2" />
              {t("pos.holdOrder")}
            </Button>
          </div>
        </Card>

        {/* Payment Panel - Hidden on Mobile */}
        <div className={cn(
          "hidden",
          "lg:flex lg:flex-col lg:col-span-3"
        )}>
          <PaymentPanel
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            subtotal={subtotal}
            discount={discount}
            onDiscountChange={setDiscount}
            tax={taxAmount}
            total={total}
            cart={cart}
            notes={notes}
            isOnline={isOnline}
            onSaleComplete={clearCart}
            onLoadPendingSales={loadPendingSalesCount}
          />
        </div>
      </div>

      {/* Mobile Cart Bar */}
      <MobileCartBar
        itemCount={itemCount}
        total={total}
        onOpenCart={() => setShowPaymentModal(true)}
      />

      {/* Mobile Payment Modal */}
      <MobilePaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        items={cart}
        onUpdateQty={updateCartItemQty}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        subtotal={subtotal}
        discount={discount}
        onDiscountChange={setDiscount}
        tax={taxAmount}
        total={total}
        onPayment={handlePayment}
        processing={processing}
      />
    </div>
  );
}
