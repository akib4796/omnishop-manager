import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Wifi, WifiOff, ShoppingCart, Clock, Pause, UserPlus, Loader2, Plus, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { account } from "@/integrations/appwrite";
import { getProducts, updateProductStock, getProductById, Product } from "@/integrations/appwrite/products";
import { getCategories, Category } from "@/integrations/appwrite/categories";
import { getCustomers, Customer, createCustomer } from "@/integrations/appwrite/customers";
import { createPendingSale, SaleData } from "@/integrations/appwrite/sales";
import { createPayment } from "@/integrations/appwrite/payments";
import { updateWalletBalance } from "@/integrations/appwrite/wallets";
import { createQuotation } from "@/integrations/appwrite/quotations";
import { getSuppliers, Supplier, createPurchaseOrder, getPurchaseOrders, createSupplier } from "@/integrations/appwrite/inventory";
import { useAuth } from "@/hooks/useAuth";
import { syncManager } from "@/lib/sync-manager";
import { getCachedProducts, getPendingSales, initOfflineDB, savePendingSale } from "@/lib/offline-db";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import ProductGrid from "@/components/pos/ProductGrid";
import Cart from "@/components/pos/Cart";
import PaymentPanel from "@/components/pos/PaymentPanel";
import { MobileCartBar } from "@/components/pos/MobileCartBar";
import { MobilePaymentModal } from "@/components/pos/MobilePaymentModal";
import { POSNavSheet } from "@/components/pos/POSNavSheet";
import { ShiftStatusBar } from "@/components/pos/ShiftStatusBar";
import { getWallets } from "@/integrations/appwrite/wallets";
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
  // Debug: Log imageUrl to see if it exists
  if (product.imageUrl) {
    console.log('[POS] Product image:', product.name, product.imageUrl);
  }

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
    purchase_price: product.purchasePrice,
    trade_price: product.tradePrice,
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
    priceTier: customer.priceTier,
    creditLimit: customer.creditLimit,
  };
}

export default function POS() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const { user, profile, isLoading: authLoading } = useAuth();
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
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string | null>(null);
  // Quick Add Customer state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  // Purchase Orders state (for looking up last purchase price)
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  // Quick Stock Refill state
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillProduct, setRefillProduct] = useState<any>(null);
  const [refillQuantity, setRefillQuantity] = useState("");
  const [refillUnitPrice, setRefillUnitPrice] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [refillNote, setRefillNote] = useState("");
  const [refilling, setRefilling] = useState(false);
  // Quick supplier creation state
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", email: "" });
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  // Partial/Split payment state
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<string>("");
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<string>("cash");
  // Cash in/out during current shift for drawer tracking
  const [shiftCashIn, setShiftCashIn] = useState<number>(0);

  // Note: Navigation is now handled by the POSNavSheet component
  // which internally uses useAuth() for label-based access control

  // Filter customers by search query
  const filteredCustomers = customers.filter((c: any) => {
    if (!customerSearch.trim()) return true;
    const query = customerSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query)
    );
  });

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
        if (cart.length > 0) initiatePayment("cash");
      } else if (e.key === "F3") {
        e.preventDefault();
        if (cart.length > 0) initiatePayment("mobile");
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
          const [productsRes, categoriesRes, customersRes, suppliersRes, purchaseOrdersRes, walletsRes] = await Promise.all([
            getProducts(tenantId),
            getCategories(tenantId),
            getCustomers(tenantId),
            getSuppliers(tenantId),
            getPurchaseOrders(tenantId),
            getWallets(tenantId),
          ]);

          if (productsRes) setProducts(productsRes.map(productToGridFormat));
          if (categoriesRes) setCategories(categoriesRes.map(categoryToGridFormat));
          if (customersRes) setCustomers(customersRes.map(customerToGridFormat));
          if (suppliersRes) setSuppliers(suppliersRes);
          if (purchaseOrdersRes) setPurchaseOrders(purchaseOrdersRes);
          // Shift cash tracking is handled by shiftCashIn state, not wallet balance
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

  // Load Quotation from localStorage if coming from Quotations page
  useEffect(() => {
    const pendingQuote = localStorage.getItem("pendingQuoteLoad");
    if (pendingQuote && customers.length > 0) {
      try {
        const quote = JSON.parse(pendingQuote);

        // Clear existing cart
        setCart([]);

        // Add items from quote
        const items = quote.items.map((item: any) => ({
          productId: item.productId,
          name: item.productName || item.name,
          price: item.price,
          originalPrice: item.price,
          quantity: item.quantity,
          image: null,
          currentStock: 999, // Placeholder - ideally fetch real stock
        }));

        setCart(items);

        // Try to set customer if we have customers loaded
        if (quote.customerId) {
          const cust = customers.find(c => c.id === quote.customerId);
          if (cust) setSelectedCustomer(cust);
        }

        setNotes(quote.notes || "");

        toast.success(t("pos.quoteLoaded", "Quotation loaded!"));
        localStorage.removeItem("pendingQuoteLoad");

      } catch (e) {
        console.error("Failed to load quote", e);
        toast.error("Failed to load quotation");
        localStorage.removeItem("pendingQuoteLoad");
      }
    }
  }, [customers]); // Runs when customers are loaded

  const addToCart = useCallback((product: any) => {
    const currentStock = product.current_stock ?? 0;

    // Check if item is out of stock - show refill modal
    if (currentStock <= 0) {
      setRefillProduct(product);
      setRefillQuantity("");
      setRefillNote("");
      setSelectedSupplierId("");

      // Find last purchase price from purchase orders
      let lastPrice = "";
      const productId = product.id || product.$id; // Try both ID formats

      for (const po of purchaseOrders) {
        // Parse items if they're a JSON string
        let items = po.items;
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            continue;
          }
        }

        if (items && Array.isArray(items)) {
          const item = items.find((i: any) =>
            i.productId === productId ||
            i.productId === product.id ||
            i.productId === product.$id
          );
          if (item && item.unitPrice) {
            lastPrice = item.unitPrice.toString();
            break; // Found most recent (POs are sorted by createdAt desc)
          }
        }
      }
      setRefillUnitPrice(lastPrice);

      setShowRefillModal(true);
      return;
    }

    // Determine price based on customer tier
    const isWholesale = selectedCustomer?.priceTier === 'wholesale' || selectedCustomer?.priceTier === 'dealer';
    // Use trade_price if eligible AND it exists (>0), otherwise fallback to selling_price
    const finalPrice = (isWholesale && product.trade_price && product.trade_price > 0)
      ? product.trade_price
      : product.selling_price;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);

      if (existingItem) {
        // Check if adding more would exceed stock
        if (existingItem.quantity >= currentStock) {
          toast.warning(
            i18n.language === "bn"
              ? `সর্বোচ্চ ${currentStock}টি যোগ করা যাবে`
              : `Maximum ${currentStock} available`,
            { duration: 2000 }
          );
          return prevCart; // Don't add more
        }

        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, price: finalPrice } // Update price too just in case
            : item
        );
      } else {
        return [...prevCart, {
          productId: product.id,
          name: product.name,
          price: finalPrice,
          purchasePrice: product.purchase_price || 0, // For profit margin calculation
          quantity: 1,
          currentStock: currentStock,
        }];
      }
    });
    toast.success(t("pos.itemAdded"), { duration: 1000 });
  }, [t, i18n.language, purchaseOrders, selectedCustomer]);

  // Recalculate cart prices when customer changes
  useEffect(() => {
    if (cart.length === 0) return;

    const isWholesale = selectedCustomer?.priceTier === 'wholesale' || selectedCustomer?.priceTier === 'dealer';

    setCart(prevCart => prevCart.map(item => {
      // Find original product to get trade_price
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) return item;

      const newPrice = (isWholesale && product.trade_price && product.trade_price > 0)
        ? product.trade_price
        : product.selling_price;

      return { ...item, price: newPrice };
    }));
  }, [selectedCustomer, products]);

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

  const handleSaveQuote = async () => {
    if (cart.length === 0) return;
    if (!tenantId) return;

    // Require a customer for quotations? Or allow 'Walk-in'?
    // Usually quotes are for specific people.
    // If no customer selected, ask to select one? 
    // For now, allow default 'Guest' if none, but ideally prompt.

    // We'll use the current customer name or prompt
    const customerName = selectedCustomer?.name || (i18n.language === 'bn' ? 'সাধারণ ক্রেতা' : 'Guest Customer');

    setProcessing(true);
    try {
      const user = await account.get();

      const quoteString = await createQuotation({
        tenantId,
        customerId: selectedCustomer?.$id || selectedCustomer?.id,
        customerName: customerName,
        customerPhone: selectedCustomer?.phone,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: 'pcs' // We might need to pull unit from product list if needed
        })),
        subtotal,
        tax: taxAmount,
        discount,
        total,
        notes: notes,
        createdBy: user.$id,
        // validUntil: default 7 days? we'll leave optional for now
      });

      toast.success(t("quotations.created", "Quotation created successfully!"));
      clearCart();
    } catch (error: any) {
      console.error("Error creating quotation:", error);
      toast.error("Failed to create quotation");
    } finally {
      setProcessing(false);
    }
  };

  // Show confirmation modal before processing payment
  const initiatePayment = useCallback((paymentMethod: string) => {
    if (cart.length === 0) return;
    setPendingPaymentMethod(paymentMethod);
  }, [cart.length]);

  // Actually process the payment after confirmation
  const confirmPayment = useCallback(() => {
    if (pendingPaymentMethod) {
      // Pass current partial payment values to avoid stale closure
      handlePaymentInternal(
        pendingPaymentMethod,
        partialPaymentAmount,
        partialPaymentMethod
      );
      setPendingPaymentMethod(null);
    }
  }, [pendingPaymentMethod, partialPaymentAmount, partialPaymentMethod]);

  // Cancel the pending payment
  const cancelPayment = useCallback(() => {
    setPendingPaymentMethod(null);
  }, []);

  // Quick Add Customer handler
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error(i18n.language === "bn" ? "নাম দিন" : "Please enter name");
      return;
    }
    if (!tenantId) {
      toast.error("Tenant ID missing");
      return;
    }

    setAddingCustomer(true);
    try {
      const newCustomer = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        tenantId,
      });

      // Add to list and select
      setCustomers((prev: any[]) => [...prev, newCustomer]);
      setSelectedCustomer(newCustomer);

      toast.success(i18n.language === "bn" ? "গ্রাহক যোগ হয়েছে!" : "Customer added!");

      // Reset form
      setNewCustomerName("");
      setNewCustomerPhone("");
      setShowAddCustomer(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add customer");
    } finally {
      setAddingCustomer(false);
    }
  };

  // Quick Supplier Add handler (similar to customer add)
  const handleQuickAddSupplier = async () => {
    if (!newSupplier.name.trim()) {
      toast.error(i18n.language === "bn" ? "সাপ্লায়ারের নাম দিন" : "Enter supplier name");
      return;
    }
    if (!tenantId) return;

    setCreatingSupplier(true);
    try {
      const created = await createSupplier({
        name: newSupplier.name.trim(),
        phone: newSupplier.phone.trim() || undefined,
        email: newSupplier.email.trim() || undefined,
        tenantId,
      });

      // Add to local suppliers list and auto-select
      setSuppliers(prev => [...prev, created]);
      setSelectedSupplierId(created.$id);

      // Reset form
      setNewSupplier({ name: "", phone: "", email: "" });
      setShowNewSupplierForm(false);

      toast.success(i18n.language === "bn" ? "সাপ্লায়ার যোগ হয়েছে" : "Supplier added");
    } catch (error: any) {
      console.error("Supplier add error:", error);
      toast.error(error.message || "Failed to add supplier");
    } finally {
      setCreatingSupplier(false);
    }
  };

  // Quick Stock Refill handler - Creates auto Purchase Order
  const handleRefillStock = async (addToCartAfter: boolean = false) => {
    const qty = parseInt(refillQuantity) || 0;
    const unitPrice = parseFloat(refillUnitPrice) || 0;

    if (qty <= 0) {
      toast.error(i18n.language === "bn" ? "সঠিক পরিমাণ দিন" : "Enter a valid quantity");
      return;
    }
    if (!selectedSupplierId) {
      toast.error(i18n.language === "bn" ? "সাপ্লায়ার নির্বাচন করুন" : "Please select a supplier");
      return;
    }
    if (unitPrice <= 0) {
      toast.error(i18n.language === "bn" ? "ইউনিট প্রাইস দিন" : "Enter unit price");
      return;
    }
    if (!refillProduct || !tenantId) return;

    setRefilling(true);
    try {
      const user = await account.get();
      if (!user) throw new Error("Not authenticated");

      // Find supplier name
      const selectedSupplier = suppliers.find(s => s.$id === selectedSupplierId);
      const totalAmount = qty * unitPrice;

      // 1. Update stock via API
      await updateProductStock(refillProduct.id, qty);

      // 2. Create auto Purchase Order
      await createPurchaseOrder({
        supplierId: selectedSupplierId,
        supplierName: selectedSupplier?.name || '',
        items: [{
          productId: refillProduct.id,
          productName: refillProduct.name,
          quantity: qty,
          unitPrice: unitPrice,
        }],
        totalAmount,
        notes: refillNote || `POS stock refill for ${refillProduct.name}`,
        tenantId,
        createdBy: user.$id,
        paymentStatus: 'not_paid',
        amountPaid: 0,
        source: 'pos_refill',
      });

      // 3. Update local product list
      const newStock = (refillProduct.current_stock ?? 0) + qty;
      setProducts((prev: any[]) =>
        prev.map(p =>
          p.id === refillProduct.id
            ? { ...p, current_stock: newStock }
            : p
        )
      );

      toast.success(
        i18n.language === "bn"
          ? `${qty}টি স্টক যোগ হয়েছে! PO তৈরি হয়েছে।`
          : `Added ${qty} units! Purchase Order created.`,
        { duration: 3000 }
      );

      // Close modal and reset all fields
      setShowRefillModal(false);
      setRefillProduct(null);
      setRefillQuantity("");
      setRefillUnitPrice("");
      setSelectedSupplierId("");
      setRefillNote("");

      // Optionally add to cart after refill
      if (addToCartAfter) {
        const updatedProduct = { ...refillProduct, current_stock: newStock };
        addToCart(updatedProduct);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update stock");
    } finally {
      setRefilling(false);
    }
  };

  const handlePaymentInternal = async (
    paymentMethod: string,
    partialAmountStr?: string,
    partialMethod?: string
  ) => {
    if (cart.length === 0 || processing || !tenantId) return;

    setProcessing(true);

    try {
      const user = await account.get();
      if (!user) throw new Error("Not authenticated");

      console.log('[POS] Checkout - Selected Customer:', selectedCustomer); // Debug log



      if (isOnline) {
        // Calculate initial amount paid for the sale record
        // This ensures the receipt shows the correct "Paid" amount immediately
        const partialVal = parseFloat(partialAmountStr || '') || 0;
        const isSplit = paymentMethod === 'credit' && partialVal > 0 && partialVal < total;

        let initialAmountPaid = 0;
        if (paymentMethod === 'credit') {
          initialAmountPaid = isSplit ? partialVal : 0;
        } else {
          initialAmountPaid = total; // Fully paid
        }

        const saleData: SaleData = {
          tenantId: tenantId,
          customerId: selectedCustomer?.$id || selectedCustomer?.id || null,
          customerName: selectedCustomer?.name || undefined,
          items: cart.map(item => ({
            productId: item.productId,
            name: item.name,
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
          // Embed amountPaid in the JSON data to avoid schema issues
          amountPaid: initialAmountPaid
        };

        console.log('[POS] Creating sale with amountPaid:', initialAmountPaid);

        // Create sale in Appwrite
        const pendingSale = await createPendingSale({
          tenantId: tenantId,
          saleData: saleData,
          synced: true,
          syncedAt: new Date().toISOString(),
          amountPaid: initialAmountPaid,
        });

        // ====== RECORD IN LEDGER (for Cashbook/Accounting) ======
        try {
          // Map POS payment methods to ledger wallet names
          const getWalletMethod = (method: string) => {
            switch (method) {
              case 'cash': return 'Cash';
              case 'card': return 'Bank Transfer';
              case 'mobile': return 'Mobile Money';
              case 'credit': return 'Credit';
              default: return 'Cash';
            }
          };

          // Check for split/partial payment (credit with partial amount paid)
          // Use passed arguments to avoid stale closure
          const partialAmount = parseFloat(partialAmountStr || '') || 0;
          const isPartialPayment = paymentMethod === 'credit' && partialAmount > 0 && partialAmount < total;

          console.log('[POS] Payment check:', {
            paymentMethod,
            partialAmountStr,
            partialAmount,
            partialMethod,
            total,
            isPartialPayment,
            selectedCustomerId: selectedCustomer?.$id || selectedCustomer?.id
          });

          if (isPartialPayment) {
            // SPLIT PAYMENT: Part cash/card/mobile + Part credit
            const creditAmount = total - partialAmount;

            console.log('[POS] Split payment detected:', {
              total,
              paidNow: partialAmount,
              method: partialPaymentMethod,
              onCredit: creditAmount
            });

            // Entry 1: Paid portion (cash/card/mobile)
            await createPayment({
              tenantId,
              type: 'IN',
              category: 'SALE',
              entityId: selectedCustomer?.$id || selectedCustomer?.id,
              amount: partialAmount,
              method: getWalletMethod(partialMethod || 'cash'),
              referenceId: pendingSale.$id, // Link to sale
            });
            await updateWalletBalance(tenantId, getWalletMethod(partialMethod || 'cash'), partialAmount, 'IN');

            // Update shift cash tracking (if cash payment)
            if ((partialMethod || 'cash') === 'cash') {
              setShiftCashIn(prev => prev + partialAmount);
            }

            // Entry 2: Credit portion (goes to customer balance)
            const creditPayment = await createPayment({
              tenantId,
              type: 'IN',
              category: 'SALE',
              entityId: selectedCustomer?.$id || selectedCustomer?.id,
              amount: creditAmount,
              method: 'Credit',
              referenceId: pendingSale.$id, // Link to sale
            });
            console.log('[POS] Credit payment created:', creditPayment);

            console.log('[POS] Split payment recorded: ৳' + partialAmount + ' paid, ৳' + creditAmount + ' on credit');

          } else {
            // SINGLE PAYMENT METHOD
            console.log('[POS] Recording sale to ledger:', { tenantId, type: 'IN', category: 'SALE', amount: total, method: paymentMethod });

            const payment = await createPayment({
              tenantId,
              type: 'IN',
              category: 'SALE',
              entityId: selectedCustomer?.$id || selectedCustomer?.id,
              amount: total,
              method: getWalletMethod(paymentMethod),
              referenceId: pendingSale.$id, // Link to sale
            });
            console.log('[POS] Payment created:', payment);

            console.log('[POS] Sale recorded to ledger successfully!');

            // Also update wallet balance directly
            await updateWalletBalance(tenantId, getWalletMethod(paymentMethod), total, 'IN');

            // Update shift cash tracking (if cash payment)
            if (paymentMethod === 'cash') {
              setShiftCashIn(prev => prev + total);
            }
          }

          // Reset partial payment state
          setPartialPaymentAmount("");
          setPartialPaymentMethod("cash");

        } catch (ledgerError: any) {
          console.error('[POS] Failed to record sale to ledger:', ledgerError);
          // Don't block the sale, just warn
          toast.warning('Sale complete, but accounting ledger not updated');
        }
        // ========================================================

        // Update product stock on server
        for (const item of cart) {
          try {
            const product = await getProductById(item.productId);
            if (product) {
              await updateProductStock(item.productId, (product.currentStock || 0) - item.quantity);
            }
          } catch (err) {
            console.error(`Failed to update stock for ${item.productId}: `, err);
          }
        }

        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        toast.success(t("pos.saleCompleted"));
      } else {
        // Calculate amount paid for offline record
        const partialVal = parseFloat(partialAmountStr || '') || 0;
        const isSplit = paymentMethod === 'credit' && partialVal > 0 && partialVal < total;
        let initialAmountPaid = 0;
        if (paymentMethod === 'credit') {
          initialAmountPaid = isSplit ? partialVal : 0;
        } else {
          initialAmountPaid = total;
        }

        // Save to local IndexedDB for later sync
        await savePendingSale({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          sale_data: {
            ...saleData,
            amountPaid: initialAmountPaid, // Add to JSON blob for offline too
            items: cart.map(item => ({
              product_id: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
          created_at: new Date().toISOString(),
          // amountPaid: initialAmountPaid, // Optional in local DB, but vital in saleData
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
  const taxAmount = 0; // Tax disabled - was: subtotal * 0.05
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Online/Offline Banner with Navigation Menu */}
      <div className={cn(
        "px-4 py-1.5 text-xs font-medium shrink-0 relative",
        isOnline
          ? "bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/30"
          : "bg-red-500/20 text-red-400 border-b border-red-500/30"
      )}>
        <div className="flex items-center justify-between">
          {/* Online/Offline Status */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>{t("pos.onlineBanner")}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>{t("pos.offlineBanner")}</span>
                {pendingSalesCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs bg-red-500/30 text-red-300 border-red-500/50">
                    {formatCount(pendingSalesCount)} {i18n.language === "bn" ? "পেন্ডিং" : "pending"}
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Navigation Menu using standardized POSNavSheet */}
          <POSNavSheet />
        </div>
      </div>

      {/* Shift Status Bar */}
      <ShiftStatusBar
        tenantId={tenantId}
        userId={user?.$id || ''}
        shiftCashIn={shiftCashIn}
      />

      {/* Main POS Layout - Split Screen */}
      <div className={cn(
        "flex-1 overflow-hidden",
        // Mobile: Single column
        "flex flex-col",
        // Desktop: 65/35 Split using CSS Grid
        "md:grid md:grid-cols-[65fr_35fr] md:gap-0"
      )}>
        {/* LEFT ZONE: Product Grid (65%) */}
        <div className={cn(
          "flex-1 overflow-hidden",
          // Mobile: Add bottom padding for floating cart bar
          "pb-24 md:pb-0"
        )}>
          <ProductGrid
            products={products}
            categories={categories}
            onProductClick={addToCart}
          />
        </div>

        {/* RIGHT ZONE: Action Panel (35%) - Hidden on Mobile */}
        <div className={cn(
          "hidden md:flex md:flex-col",
          "bg-slate-800/90 border-l border-slate-700/50",
          "h-full overflow-hidden"
        )}>
          {/* Cart Header with Hold/Quote Icons */}
          <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between shrink-0 bg-slate-700/30">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-indigo-400" />
              <span className="font-bold text-sm">{t("pos.cart")}</span>
              {cart.length > 0 && (
                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50 text-xs px-1.5 py-0">
                  {formatCount(itemCount)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Held Orders Badge */}
              {heldOrders.length > 0 && (
                <button
                  className="h-7 px-2 rounded bg-amber-500/20 text-amber-400 text-xs flex items-center gap-1 hover:bg-amber-500/30"
                  onClick={() => {
                    if (heldOrders.length > 0) {
                      resumeOrder(heldOrders[heldOrders.length - 1]);
                    }
                  }}
                >
                  <Clock className="h-3 w-3" />
                  {formatCount(heldOrders.length)}
                </button>
              )}
              {/* Hold Icon */}
              <button
                className="h-7 w-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center hover:bg-amber-500/20 disabled:opacity-50"
                onClick={holdOrder}
                disabled={cart.length === 0}
                title="Hold Order"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
              {/* Quote Icon */}
              <button
                className="h-7 w-7 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 disabled:opacity-50"
                onClick={handleSaveQuote}
                disabled={cart.length === 0 || processing}
                title="Save Quote"
              >
                <FileDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <Cart
            items={cart}
            onUpdateQty={updateCartItemQty}
            notes={notes}
            onNotesChange={setNotes}
          />

          {/* COMPACT PAYMENT PANEL */}
          <div className="px-2 py-2 space-y-2 shrink-0 border-t border-slate-700/50 bg-slate-800/95">
            {/* Customer Selector */}
            <div className="bg-slate-700/30 rounded-lg border border-slate-600/30 p-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {t("pos.customer")}
                </label>
                {!showAddCustomer && (
                  <button
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    onClick={() => setShowAddCustomer(true)}
                  >
                    <UserPlus className="h-3 w-3" />
                    {i18n.language === "bn" ? "নতুন" : "New"}
                  </button>
                )}
              </div>

              {showAddCustomer ? (
                // Quick Add Customer Form
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder={i18n.language === "bn" ? "গ্রাহকের নাম *" : "Customer name *"}
                    className={cn(
                      "w-full h-10 px-3 rounded-lg text-sm",
                      "bg-slate-800/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    )}
                    autoFocus
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder={i18n.language === "bn" ? "ফোন (ঐচ্ছিক)" : "Phone (optional)"}
                    className={cn(
                      "w-full h-10 px-3 rounded-lg text-sm",
                      "bg-slate-800/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    )}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 bg-slate-700/50 border-slate-600/50 text-slate-300"
                      onClick={() => {
                        setShowAddCustomer(false);
                        setNewCustomerName("");
                        setNewCustomerPhone("");
                      }}
                    >
                      {i18n.language === "bn" ? "বাতিল" : "Cancel"}
                    </Button>
                    <Button
                      size="sm"
                      className={cn(
                        "flex-1 h-9",
                        "bg-gradient-to-r from-indigo-500 to-purple-600"
                      )}
                      onClick={handleAddCustomer}
                      disabled={addingCustomer || !newCustomerName.trim()}
                    >
                      {addingCustomer ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span>{i18n.language === "bn" ? "যোগ" : "Add"}</span>
                      )}
                    </Button>
                  </div>
                </div>
              ) : selectedCustomer ? (
                // Show selected customer with clear button
                <div className="flex gap-2">
                  <div className={cn(
                    "flex-1 h-11 px-3 rounded-xl text-sm font-medium",
                    "bg-slate-800/50 border border-slate-600/50 text-white",
                    "flex items-center"
                  )}>
                    <span className="truncate">{selectedCustomer.name}</span>
                    {selectedCustomer.phone && (
                      <span className="text-slate-500 ml-2 text-xs">({selectedCustomer.phone})</span>
                    )}
                  </div>
                  <button
                    className="h-11 w-11 rounded-xl bg-slate-700/50 border border-slate-600/50 text-slate-400 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                // Expandable Customer List with Search
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCustomerList(!showCustomerList)}
                    className={cn(
                      "w-full h-11 px-3 rounded-xl text-sm font-medium text-left",
                      "bg-slate-800/50 border border-slate-600/50 text-slate-400",
                      "flex items-center justify-between",
                      "hover:bg-slate-700/50 transition-colors"
                    )}
                  >
                    <span>{i18n.language === "bn" ? "ওয়াক-ইন কাস্টমার" : "Walk-in Customer"}</span>
                    <span className={cn(
                      "transition-transform",
                      showCustomerList && "rotate-180"
                    )}>▼</span>
                  </button>

                  {/* Expandable Customer List with Search */}
                  {showCustomerList && (
                    <div className="bg-slate-800/80 rounded-xl border border-slate-600/50 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-2 border-b border-slate-700/50">
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder={i18n.language === "bn" ? "🔍 নাম বা ফোন দিয়ে খুঁজুন..." : "🔍 Search by name or phone..."}
                          className={cn(
                            "w-full h-9 px-3 rounded-lg text-sm",
                            "bg-slate-700/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          )}
                          autoFocus
                        />
                      </div>

                      {/* Customer List */}
                      <div className="max-h-40 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((c: any) => (
                            <button
                              key={c.id || c.$id || c.customerId}
                              onClick={() => {
                                setSelectedCustomer(c);
                                setShowCustomerList(false);
                                setCustomerSearch("");
                              }}
                              className={cn(
                                "w-full px-3 py-2 text-sm text-left",
                                "flex items-center justify-between",
                                "hover:bg-slate-700/50",
                                "border-b border-slate-700/50 last:border-b-0",
                                "transition-colors"
                              )}
                            >
                              <span className="text-white font-medium">{c.name}</span>
                              {c.phone && (
                                <span className="text-slate-400 text-xs">{c.phone}</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 text-center py-3">
                            {customerSearch
                              ? (i18n.language === "bn" ? "কোন ফলাফল নেই" : "No results found")
                              : (i18n.language === "bn" ? "কোন গ্রাহক নেই" : "No customers")
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Totals - Frosted Glass */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-3 space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>{t("pos.subtotal")}</span>
                <span className="font-mono">{i18n.language === "bn" ? `৳${toBengaliNumerals(Math.round(subtotal))} ` : `৳${Math.round(subtotal).toLocaleString()} `}</span>
              </div>

              {/* Discount Input Row */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">{t("pos.discount")}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className={cn(
                    "w-20 h-8 px-2 rounded-lg text-right text-sm font-mono",
                    "bg-slate-800/50 border border-slate-600/50 text-white",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  )}
                />
              </div>

              <div className="flex justify-between text-sm text-slate-400">
                <span>{t("pos.tax")}</span>
                <span className="font-mono">{i18n.language === "bn" ? `৳${toBengaliNumerals(Math.round(taxAmount))} ` : `৳${Math.round(taxAmount).toLocaleString()} `}</span>
              </div>

              <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                <span className="text-white">{t("pos.total")}</span>
                <span className="font-mono text-indigo-400">
                  {i18n.language === "bn" ? `৳${toBengaliNumerals(Math.round(total))} ` : `৳${Math.round(total).toLocaleString()} `}
                </span>
              </div>
            </div>

            {/* Payment Methods Grid - Frosted Glass */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className={cn(
                    "h-14 rounded-xl flex flex-col items-center justify-center gap-1",
                    "bg-indigo-500/20 border-indigo-500/50 text-indigo-300",
                    "hover:bg-indigo-500/30 hover:border-indigo-500/70",
                    "transition-all duration-200"
                  )}
                  onClick={() => initiatePayment("cash")}
                  disabled={cart.length === 0 || processing}
                >
                  <span className="text-lg">💵</span>
                  <span className="text-xs font-medium">{i18n.language === "bn" ? "ক্যাশ" : "Cash"}</span>
                </Button>

                <Button
                  variant="outline"
                  className={cn(
                    "h-14 rounded-xl flex flex-col items-center justify-center gap-1",
                    "bg-slate-700/50 border-slate-600/50 text-slate-300",
                    "hover:bg-slate-700/70 hover:border-slate-500/70",
                    "transition-all duration-200"
                  )}
                  onClick={() => initiatePayment("card")}
                  disabled={cart.length === 0 || processing}
                >
                  <span className="text-lg">💳</span>
                  <span className="text-xs font-medium">{i18n.language === "bn" ? "কার্ড" : "Card"}</span>
                </Button>

                <Button
                  variant="outline"
                  className={cn(
                    "h-14 rounded-xl flex flex-col items-center justify-center gap-1",
                    "bg-slate-700/50 border-slate-600/50 text-slate-300",
                    "hover:bg-slate-700/70 hover:border-slate-500/70",
                    "transition-all duration-200"
                  )}
                  onClick={() => initiatePayment("mobile")}
                  disabled={cart.length === 0 || processing}
                >
                  <span className="text-lg">📱</span>
                  <span className="text-xs font-medium">bKash/Nagad</span>
                </Button>

                <Button
                  variant="outline"
                  className={cn(
                    "h-14 rounded-xl flex flex-col items-center justify-center gap-1",
                    "bg-slate-700/50 border-slate-600/50 text-slate-300",
                    "hover:bg-slate-700/70 hover:border-slate-500/70",
                    "transition-all duration-200"
                  )}
                  onClick={() => initiatePayment("credit")}
                  disabled={cart.length === 0 || processing}
                >
                  <span className="text-lg">📝</span>
                  <span className="text-xs font-medium">{i18n.language === "bn" ? "বাকি" : "Credit"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal - Shows cart preview before processing */}
      {pendingPaymentMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden border border-slate-700/50 shadow-2xl">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-700/30">
              <h2 className="text-lg font-bold text-white text-center">
                {i18n.language === "bn" ? "পেমেন্ট নিশ্চিত করুন" : "Confirm Payment"}
              </h2>
              <p className="text-xs text-slate-400 text-center mt-1">
                {pendingPaymentMethod === "cash" && (i18n.language === "bn" ? "💵 ক্যাশ পেমেন্ট" : "💵 Cash Payment")}
                {pendingPaymentMethod === "card" && (i18n.language === "bn" ? "💳 কার্ড পেমেন্ট" : "💳 Card Payment")}
                {pendingPaymentMethod === "mobile" && "📱 bKash/Nagad"}
                {pendingPaymentMethod === "credit" && (i18n.language === "bn" ? "📝 বাকি" : "📝 Credit")}
              </p>
            </div>

            {/* Cart Preview - Scrollable with Edit Controls */}
            <div className="max-h-[35vh] overflow-y-auto p-3 space-y-2">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center gap-2 py-2 px-3 rounded-xl bg-slate-700/30 border border-slate-700/50">
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {i18n.language === "bn" ? `৳${toBengaliNumerals(Math.round(item.price))} ` : `৳${Math.round(item.price).toLocaleString()} `}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      className="h-8 w-8 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                      onClick={() => updateCartItemQty(item.productId, item.quantity - 1)}
                    >
                      <span className="text-lg font-bold">−</span>
                    </button>
                    <span className="w-8 text-center font-bold text-white text-sm">
                      {i18n.language === "bn" ? toBengaliNumerals(item.quantity) : item.quantity}
                    </span>
                    <button
                      className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/30 transition-colors"
                      onClick={() => updateCartItemQty(item.productId, item.quantity + 1)}
                    >
                      <span className="text-lg font-bold">+</span>
                    </button>
                  </div>

                  {/* Item Total */}
                  <p className="text-sm font-bold text-indigo-400 w-16 text-right">
                    {i18n.language === "bn" ? `৳${toBengaliNumerals(Math.round(item.price * item.quantity))} ` : `৳${Math.round(item.price * item.quantity).toLocaleString()} `}
                  </p>

                  {/* Remove Button */}
                  <button
                    className="h-8 w-8 rounded-full bg-slate-700/50 text-slate-400 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    onClick={() => updateCartItemQty(item.productId, 0)}
                  >
                    <span className="text-sm">✕</span>
                  </button>
                </div>
              ))}

              {/* Empty Cart Warning */}
              {cart.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <p>{i18n.language === "bn" ? "কার্ট খালি" : "Cart is empty"}</p>
                </div>
              )}
            </div>

            {/* Totals Summary with Discount Input */}
            <div className="px-4 py-3 bg-slate-700/20 border-t border-slate-700/50 space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>{t("pos.subtotal")}</span>
                <span className="font-mono">{i18n.language === "bn" ? `৳${toBengaliNumerals(Math.round(subtotal))} ` : `৳${Math.round(subtotal).toLocaleString()} `}</span>
              </div>

              {/* Editable Discount Row */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">{t("pos.discount")}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className={cn(
                    "w-24 h-8 px-3 rounded-lg text-right text-sm font-mono",
                    "bg-slate-700/50 border border-slate-600/50 text-white",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  )}
                />
              </div>

              <div className="flex justify-between text-sm text-slate-400">
                <span>{t("pos.tax")}</span>
                <span className="font-mono">{i18n.language === "bn" ? `৳${toBengaliNumerals(Math.round(taxAmount))} ` : `৳${Math.round(taxAmount).toLocaleString()} `}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-600/50">
                <span className="text-white">{t("pos.total")}</span>
                <span className="font-mono text-indigo-400">
                  {i18n.language === "bn" ? `৳${toBengaliNumerals(Math.round(total))} ` : `৳${Math.round(total).toLocaleString()} `}
                </span>
              </div>

              {/* Partial Payment Section - Shows when Credit is selected with a customer */}
              {pendingPaymentMethod === "credit" && selectedCustomer && (
                <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-3">
                  <p className="text-xs text-amber-400 font-medium">
                    💡 {i18n.language === "bn" ? "আংশিক পেমেন্ট (ঐচ্ছিক)" : "Partial Payment (Optional)"}
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">
                        {i18n.language === "bn" ? "এখন পেমেন্ট" : "Pay Now"}
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={partialPaymentAmount}
                        onChange={(e) => {
                          console.log('[POS] Partial amount input:', e.target.value);
                          setPartialPaymentAmount(e.target.value);
                        }}
                        placeholder="0"
                        max={total}
                        className={cn(
                          "w-full h-10 px-3 rounded-lg text-sm font-mono",
                          "bg-slate-700/50 border border-slate-600/50 text-white",
                          "focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        )}
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-slate-400 mb-1 block">
                        {i18n.language === "bn" ? "পদ্ধতি" : "Method"}
                      </label>
                      <select
                        value={partialPaymentMethod}
                        onChange={(e) => setPartialPaymentMethod(e.target.value)}
                        className={cn(
                          "w-full h-10 px-2 rounded-lg text-sm",
                          "bg-slate-700/50 border border-slate-600/50 text-white",
                          "focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        )}
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="card">💳 Card</option>
                        <option value="mobile">📱 Mobile</option>
                      </select>
                    </div>
                  </div>
                  {parseFloat(partialPaymentAmount) > 0 && parseFloat(partialPaymentAmount) < total && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-400">✓ {i18n.language === "bn" ? "এখন" : "Now"}:</span>
                        <span className="text-green-400 font-bold">৳{parseFloat(partialPaymentAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-400">📝 {i18n.language === "bn" ? "বাকি" : "Credit"}:</span>
                        <span className="text-amber-400 font-bold">৳{(total - parseFloat(partialPaymentAmount)).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-700"
                onClick={cancelPayment}
              >
                {i18n.language === "bn" ? "বাতিল" : "Cancel"}
              </Button>
              <Button
                className={cn(
                  "flex-1 h-12 rounded-xl font-bold",
                  "bg-gradient-to-r from-indigo-500 to-purple-600",
                  "hover:from-indigo-600 hover:to-purple-700",
                  "shadow-lg shadow-indigo-500/30"
                )}
                onClick={confirmPayment}
                disabled={processing}
              >
                {processing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>{t("common.loading")}</span>
                  </div>
                ) : (
                  <span>{i18n.language === "bn" ? "নিশ্চিত করুন" : "Confirm"}</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart Bar */}
      <MobileCartBar
        itemCount={itemCount}
        total={total}
        onOpenCart={() => setShowPaymentModal(true)}
      />

      {/* Quick Stock Refill Modal */}
      {showRefillModal && refillProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                📦 {i18n.language === "bn" ? "স্টক রিফিল" : "Stock Refill"}
              </h3>
              <p className="text-white/80 text-sm mt-1">
                {refillProduct.name}
              </p>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Current Stock Info */}
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-xl">
                <span className="text-slate-400 text-sm">
                  {i18n.language === "bn" ? "বর্তমান স্টক" : "Current Stock"}
                </span>
                <span className="text-red-400 font-bold text-lg">
                  {refillProduct.current_stock ?? 0}
                </span>
              </div>

              {/* Supplier Dropdown with Quick Add */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300">
                    {i18n.language === "bn" ? "সাপ্লায়ার *" : "Supplier *"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewSupplierForm(!showNewSupplierForm)}
                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {i18n.language === "bn" ? "নতুন যোগ করুন" : "Add New"}
                  </button>
                </div>

                {/* Quick Add Supplier Form */}
                {showNewSupplierForm ? (
                  <div className="space-y-3 p-3 bg-slate-700/30 rounded-xl border border-orange-500/30">
                    <input
                      type="text"
                      placeholder={i18n.language === "bn" ? "সাপ্লায়ারের নাম *" : "Supplier name *"}
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      className={cn(
                        "w-full h-10 px-3 rounded-lg text-sm",
                        "bg-slate-700/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                        "focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      )}
                    />
                    <input
                      type="tel"
                      placeholder={i18n.language === "bn" ? "ফোন নম্বর" : "Phone number"}
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className={cn(
                        "w-full h-10 px-3 rounded-lg text-sm",
                        "bg-slate-700/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                        "focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      )}
                    />
                    <input
                      type="email"
                      placeholder={i18n.language === "bn" ? "ইমেইল" : "Email"}
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                      className={cn(
                        "w-full h-10 px-3 rounded-lg text-sm",
                        "bg-slate-700/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                        "focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      )}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewSupplierForm(false);
                          setNewSupplier({ name: "", phone: "", email: "" });
                        }}
                        className="flex-1 h-9 rounded-lg text-sm font-medium bg-slate-600 text-slate-300 hover:bg-slate-500"
                      >
                        {i18n.language === "bn" ? "বাতিল" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickAddSupplier}
                        disabled={creatingSupplier || !newSupplier.name.trim()}
                        className={cn(
                          "flex-1 h-9 rounded-lg text-sm font-medium",
                          "bg-orange-500 text-white hover:bg-orange-600",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {creatingSupplier ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        ) : (
                          i18n.language === "bn" ? "যোগ করুন" : "Add"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className={cn(
                      "w-full h-11 px-3 rounded-xl text-sm font-medium",
                      "bg-slate-700/50 border border-slate-600/50 text-white",
                      "focus:outline-none focus:ring-2 focus:ring-orange-500/50",
                      "appearance-none cursor-pointer"
                    )}
                  >
                    <option value="">{i18n.language === "bn" ? "সাপ্লায়ার নির্বাচন করুন..." : "Select supplier..."}</option>
                    {suppliers.map((s) => (
                      <option key={s.$id} value={s.$id} className="bg-slate-800">
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity & Unit Price Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Quantity Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    {i18n.language === "bn" ? "পরিমাণ *" : "Quantity *"}
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={refillQuantity}
                    onChange={(e) => setRefillQuantity(e.target.value)}
                    placeholder="10"
                    className={cn(
                      "w-full h-12 px-3 rounded-xl text-lg font-bold text-center",
                      "bg-slate-700/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                      "focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    )}
                    autoFocus
                  />
                </div>

                {/* Unit Price Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    {i18n.language === "bn" ? "ইউনিট প্রাইস *" : "Unit Price *"}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={refillUnitPrice}
                    onChange={(e) => setRefillUnitPrice(e.target.value)}
                    placeholder="৳50"
                    className={cn(
                      "w-full h-12 px-3 rounded-xl text-lg font-bold text-center",
                      "bg-slate-700/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                      "focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    )}
                  />
                </div>
              </div>

              {/* Total Preview */}
              {refillQuantity && refillUnitPrice && (
                <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <span className="text-green-400 text-sm font-medium">
                    {i18n.language === "bn" ? "মোট খরচ" : "Total Cost"}
                  </span>
                  <span className="text-green-400 font-bold text-lg">
                    ৳{(parseInt(refillQuantity) * parseFloat(refillUnitPrice)).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Note Input (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">
                  {i18n.language === "bn" ? "নোট (ঐচ্ছিক)" : "Note (Optional)"}
                </label>
                <input
                  type="text"
                  value={refillNote}
                  onChange={(e) => setRefillNote(e.target.value)}
                  placeholder={i18n.language === "bn" ? "যেমন: ডেলিভারি পেয়েছি" : "e.g., Received delivery"}
                  className={cn(
                    "w-full h-10 px-3 rounded-lg text-sm",
                    "bg-slate-700/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                    "focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                  )}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 space-y-2">
              {/* Add Stock & Add to Cart */}
              <Button
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl"
                onClick={() => handleRefillStock(true)}
                disabled={refilling || !refillQuantity}
              >
                {refilling ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span>{i18n.language === "bn" ? "স্টক যোগ করুন এবং কার্টে নিন" : "Add Stock & Add to Cart"}</span>
                )}
              </Button>

              {/* Add Stock Only */}
              <Button
                variant="outline"
                className="w-full h-10 bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 rounded-xl"
                onClick={() => handleRefillStock(false)}
                disabled={refilling || !refillQuantity}
              >
                {i18n.language === "bn" ? "শুধু স্টক যোগ করুন" : "Add Stock Only"}
              </Button>

              {/* Cancel */}
              <Button
                variant="ghost"
                className="w-full h-10 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl"
                onClick={() => {
                  setShowRefillModal(false);
                  setRefillProduct(null);
                }}
                disabled={refilling}
              >
                {i18n.language === "bn" ? "বাতিল" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Payment Modal */}
      <MobilePaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        items={cart}
        onUpdateQty={updateCartItemQty}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        onCustomerCreated={(newCustomer) => {
          // Add new customer to the list
          setCustomers((prev: any[]) => [...prev, newCustomer]);
        }}
        tenantId={tenantId}
        subtotal={subtotal}
        discount={discount}
        onDiscountChange={setDiscount}
        tax={taxAmount}
        total={total}
        onPayment={handlePaymentInternal}
        processing={processing}
      />
    </div>
  );
}
