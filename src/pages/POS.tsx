import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Wifi, WifiOff, ShoppingCart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { syncManager } from "@/lib/sync-manager";
import { getCachedProducts, getPendingSales, initOfflineDB } from "@/lib/offline-db";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import ProductGrid from "@/components/pos/ProductGrid";
import Cart from "@/components/pos/Cart";
import PaymentPanel from "@/components/pos/PaymentPanel";

export default function POS() {
  const { t, i18n } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Initialize offline DB and load data
  useEffect(() => {
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

    // Sync on mount if online
    if (navigator.onLine) {
      syncManager.syncAll();
    }

    // Set up sync callback
    const unsubscribe = syncManager.onSyncStatusChange((status, message) => {
      if (status === 'success' && message) {
        const count = parseInt(message.split(' ')[0]);
        toast.success(t("sync.salesSynced", { count }));
        loadPendingSalesCount();
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, [t]);

  async function initializeData() {
    setLoading(true);
    try {
      await initOfflineDB();

      // Try to load from cache first (for offline support)
      const [cachedProducts, cachedCategories, cachedCustomers] = await Promise.all([
        getCachedProducts(),
        import("@/lib/offline-db").then(m => m.getCachedCategories()),
        import("@/lib/offline-db").then(m => m.getCachedCustomers()),
      ]);

      setProducts(cachedProducts);
      setCategories(cachedCategories);
      setCustomers(cachedCustomers);

      // If online, fetch fresh data
      if (navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [productsRes, categoriesRes, customersRes] = await Promise.all([
            supabase.from('products').select('*, categories(id, name, color)'),
            supabase.from('categories').select('*'),
            supabase.from('customers').select('*'),
          ]);

          if (productsRes.data) setProducts(productsRes.data);
          if (categoriesRes.data) setCategories(categoriesRes.data);
          if (customersRes.data) setCustomers(customersRes.data);
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

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.selling_price,
        quantity: 1,
        current_stock: product.current_stock,
      }]);
    }
    toast.success(t("pos.itemAdded"));
  };

  const updateCartItemQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter(item => item.product_id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product_id === productId ? { ...item, quantity: newQty } : item
      ));
    }
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setNotes("");
  };

  const holdOrder = () => {
    if (cart.length === 0) return;
    
    setHeldOrders([...heldOrders, {
      id: Date.now().toString(),
      cart: [...cart],
      customer: selectedCustomer,
      discount,
      notes,
      timestamp: new Date(),
    }]);
    
    clearCart();
    toast.success(t("pos.orderHeld"));
  };

  const resumeOrder = (order: any) => {
    setCart(order.cart);
    setSelectedCustomer(order.customer);
    setDiscount(order.discount);
    setNotes(order.notes);
    setHeldOrders(heldOrders.filter(o => o.id !== order.id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = subtotal * 0.05; // 5% tax (can be from tenant settings)
  const total = subtotal + taxAmount - discount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Online/Offline Banner */}
      <div className={`px-4 py-2 text-center text-sm font-medium ${
        isOnline 
          ? "bg-success text-success-foreground" 
          : "bg-destructive text-destructive-foreground"
      }`}>
        {isOnline ? (
          <div className="flex items-center justify-center gap-2">
            <Wifi className="h-4 w-4" />
            {t("pos.onlineBanner")}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            {t("pos.offlineBanner")}
            {pendingSalesCount > 0 && (
              <span className="ml-2">• {t("pos.offlineSalesCount", { count: pendingSalesCount })}</span>
            )}
          </div>
        )}
      </div>

      {/* Main POS Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left: Products Grid */}
        <div className="lg:col-span-5 flex flex-col overflow-hidden">
          <ProductGrid 
            products={products}
            categories={categories}
            onProductClick={addToCart}
          />
        </div>

        {/* Center: Cart */}
        <div className="lg:col-span-4 flex flex-col overflow-hidden">
          <Card className="flex-1 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h2 className="text-lg font-semibold">{t("pos.cart")}</h2>
              </div>
              {heldOrders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Show held orders dialog
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {heldOrders.length}
                </Button>
              )}
            </div>
            
            <Cart
              items={cart}
              onUpdateQty={updateCartItemQty}
              notes={notes}
              onNotesChange={setNotes}
            />

            <div className="p-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={holdOrder}
                disabled={cart.length === 0}
              >
                {t("pos.holdOrder")}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: Payment */}
        <div className="lg:col-span-3 flex flex-col overflow-hidden">
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
    </div>
  );
}
