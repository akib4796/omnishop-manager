import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Minus, Plus, Trash2, Check, ChevronDown, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";
import { createCustomer } from "@/integrations/appwrite/customers";
import { toast } from "sonner";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  currentStock: number;
}

interface MobilePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onUpdateQty: (productId: string, newQty: number) => void;
  customers: any[];
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  onCustomerCreated?: (customer: any) => void;
  tenantId?: string;
  subtotal: number;
  discount: number;
  onDiscountChange: (discount: number) => void;
  tax: number;
  total: number;
  onPayment: (method: string) => void;
  processing: boolean;
}

export function MobilePaymentModal({
  open,
  onOpenChange,
  items,
  onUpdateQty,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onCustomerCreated,
  tenantId,
  subtotal,
  discount,
  onDiscountChange,
  tax,
  total,
  onPayment,
  processing,
}: MobilePaymentModalProps) {
  const { t, i18n } = useTranslation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);

  // Filter customers by search query
  const filteredCustomers = customers.filter((c: any) => {
    if (!customerSearch.trim()) return true;
    const query = customerSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query)
    );
  });

  const formatPrice = (price: number) => {
    const formatted = price.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  const formatQty = (qty: number) => {
    return i18n.language === "bn" ? toBengaliNumerals(qty) : qty;
  };

  const handlePayment = async (method: string) => {
    await onPayment(method);
    setShowSuccess(true);
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    setTimeout(() => {
      setShowSuccess(false);
      onOpenChange(false);
    }, 2000);
  };

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

      // Select the new customer
      onSelectCustomer(newCustomer);

      // Notify parent to refresh customer list
      if (onCustomerCreated) {
        onCustomerCreated(newCustomer);
      }

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

  // Success Screen
  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full h-full max-h-full p-0 border-0 bg-gradient-to-br from-indigo-600 to-purple-700">
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-white p-8">
            <div className="rounded-full bg-white/20 p-6 mb-6 backdrop-blur-xl">
              <Check className="h-16 w-16" />
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {i18n.language === "bn" ? "পেমেন্ট সফল!" : "Payment Successful!"}
            </h2>
            <p className="text-xl opacity-90">
              {i18n.language === "bn" ? "ধন্যবাদ ❤️" : "Thank you ❤️"}
            </p>
            <p className="text-4xl font-bold mt-6">{formatPrice(total)}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Add Customer Quick Form
  if (showAddCustomer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full h-full max-h-full p-0 border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 border-b border-slate-700/50 flex items-center justify-between shrink-0 bg-slate-800/50 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-400" />
              {i18n.language === "bn" ? "গ্রাহক যোগ করুন" : "Add Customer"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full"
              onClick={() => setShowAddCustomer(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Form */}
          <div className="flex-1 p-4 space-y-4">
            <div className="backdrop-blur-xl bg-slate-700/30 rounded-xl border border-slate-600/50 p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 block">
                  {i18n.language === "bn" ? "নাম *" : "Name *"}
                </label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder={i18n.language === "bn" ? "গ্রাহকের নাম" : "Customer name"}
                  className={cn(
                    "w-full h-12 px-4 rounded-xl text-base",
                    "bg-slate-800/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  )}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 block">
                  {i18n.language === "bn" ? "ফোন (ঐচ্ছিক)" : "Phone (optional)"}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder={i18n.language === "bn" ? "০১XXXXXXXXX" : "01XXXXXXXXX"}
                  className={cn(
                    "w-full h-12 px-4 rounded-xl text-base",
                    "bg-slate-800/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-slate-700/50 flex gap-3 safe-area-bottom">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl bg-slate-700/50 border-slate-600/50 text-slate-300"
              onClick={() => setShowAddCustomer(false)}
            >
              {i18n.language === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            <Button
              className={cn(
                "flex-1 h-12 rounded-xl font-bold",
                "bg-gradient-to-r from-indigo-500 to-purple-600",
                "hover:from-indigo-600 hover:to-purple-700"
              )}
              onClick={handleAddCustomer}
              disabled={addingCustomer || !newCustomerName.trim()}
            >
              {addingCustomer ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span>{i18n.language === "bn" ? "যোগ করুন" : "Add"}</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-full max-h-full p-0 border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-700/50 flex items-center justify-between shrink-0 bg-slate-800/50 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white">
            {t("pos.checkout")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Cart Items - Scrollable */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-2 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur"
              >
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-white truncate">{item.name}</h4>
                  <p className="text-xs text-slate-400">{formatPrice(item.price)}</p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1">
                  <button
                    className="h-9 w-9 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500/30 active:scale-95 transition-all"
                    onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <span className="w-10 text-center font-bold text-white">
                    {formatQty(item.quantity)}
                  </span>

                  <button
                    className={cn(
                      "h-9 w-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/30 active:scale-95 transition-all",
                      item.quantity >= item.currentStock && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.currentStock}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Item Total */}
                <p className="text-sm font-bold text-indigo-400 w-16 text-right">
                  {formatPrice(item.price * item.quantity)}
                </p>

                {/* Remove Button */}
                <button
                  className="h-9 w-9 rounded-full bg-slate-700/50 text-slate-400 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 active:scale-95 transition-all"
                  onClick={() => onUpdateQty(item.productId, 0)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Empty Cart */}
            {items.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg">{i18n.language === "bn" ? "কার্ট খালি" : "Cart is empty"}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Sticky Bottom Panel */}
        <div className="shrink-0 border-t border-slate-700/50 bg-slate-800/95 backdrop-blur-xl">
          {/* Customer Selector with Add Button */}
          <div className="px-4 py-3 border-b border-slate-700/30">
            <div className="backdrop-blur-xl bg-slate-700/30 rounded-xl border border-slate-600/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  {t("pos.customer")}
                </label>
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  onClick={() => setShowAddCustomer(true)}
                >
                  <UserPlus className="h-3 w-3" />
                  {i18n.language === "bn" ? "নতুন" : "New"}
                </button>
              </div>

              {selectedCustomer ? (
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
                    onClick={() => onSelectCustomer(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                // Show expandable customer list instead of native select
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCustomerList(!showCustomerList)}
                    className={cn(
                      "w-full h-11 px-3 rounded-xl text-sm font-medium text-left",
                      "bg-slate-800/50 border border-slate-600/50 text-slate-400",
                      "flex items-center justify-between",
                      "active:bg-slate-700/50 transition-colors"
                    )}
                  >
                    <span>{i18n.language === "bn" ? "ওয়াক-ইন কাস্টমার" : "Walk-in Customer"}</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      showCustomerList && "rotate-180"
                    )} />
                  </button>

                  {/* Expandable Customer List with Search */}
                  {showCustomerList && (
                    <div className="bg-slate-800/80 rounded-xl border border-slate-600/50 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-2 border-b border-slate-700/50">
                        <input
                          type="text"
                          inputMode="search"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder={i18n.language === "bn" ? "🔍 নাম বা ফোন দিয়ে খুঁজুন..." : "🔍 Search by name or phone..."}
                          className={cn(
                            "w-full h-10 px-3 rounded-lg text-sm",
                            "bg-slate-700/50 border border-slate-600/50 text-white placeholder:text-slate-500",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          )}
                          autoFocus
                        />
                      </div>

                      {/* Customer List */}
                      <div className="max-h-36 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer: any) => (
                            <button
                              key={customer.id || customer.$id || customer.customerId}
                              onClick={() => {
                                onSelectCustomer(customer);
                                setShowCustomerList(false);
                                setCustomerSearch("");
                              }}
                              className={cn(
                                "w-full px-3 py-3 text-sm text-left",
                                "flex items-center justify-between",
                                "hover:bg-slate-700/50 active:bg-slate-600/50",
                                "border-b border-slate-700/50 last:border-b-0",
                                "transition-colors"
                              )}
                            >
                              <span className="text-white font-medium">{customer.name}</span>
                              {customer.phone && (
                                <span className="text-slate-400 text-xs">{customer.phone}</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 text-center py-4">
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
          </div>

          {/* Totals */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span>{t("pos.subtotal")}</span>
              <span className="font-mono">{formatPrice(subtotal)}</span>
            </div>

            {/* Editable Discount */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">{t("pos.discount")}</span>
              <input
                type="number"
                inputMode="decimal"
                value={discount || ""}
                onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
                placeholder="0"
                className={cn(
                  "w-24 h-9 px-3 rounded-lg text-right text-sm font-mono",
                  "bg-slate-700/50 border border-slate-600/50 text-white",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                )}
              />
            </div>

            <div className="flex justify-between text-sm text-slate-400">
              <span>{t("pos.tax")}</span>
              <span className="font-mono">{formatPrice(tax)}</span>
            </div>

            <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-600/50">
              <span className="text-white">{t("pos.total")}</span>
              <span className="font-mono text-indigo-400">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Payment Buttons */}
          <div className="p-4 pt-2 grid grid-cols-2 gap-2 safe-area-bottom">
            <Button
              onClick={() => handlePayment("cash")}
              disabled={items.length === 0 || processing}
              className={cn(
                "h-14 rounded-xl font-semibold flex flex-col items-center justify-center gap-1",
                "bg-indigo-500/20 border border-indigo-500/50 text-indigo-300",
                "hover:bg-indigo-500/30 active:scale-95 transition-all"
              )}
              variant="outline"
            >
              <span className="text-lg">💵</span>
              <span className="text-xs">{i18n.language === "bn" ? "ক্যাশ" : "Cash"}</span>
            </Button>

            <Button
              onClick={() => handlePayment("card")}
              disabled={items.length === 0 || processing}
              className={cn(
                "h-14 rounded-xl font-semibold flex flex-col items-center justify-center gap-1",
                "bg-slate-700/50 border border-slate-600/50 text-slate-300",
                "hover:bg-slate-700/70 active:scale-95 transition-all"
              )}
              variant="outline"
            >
              <span className="text-lg">💳</span>
              <span className="text-xs">{i18n.language === "bn" ? "কার্ড" : "Card"}</span>
            </Button>

            <Button
              onClick={() => handlePayment("mobile")}
              disabled={items.length === 0 || processing}
              className={cn(
                "h-14 rounded-xl font-semibold flex flex-col items-center justify-center gap-1",
                "bg-slate-700/50 border border-slate-600/50 text-slate-300",
                "hover:bg-slate-700/70 active:scale-95 transition-all"
              )}
              variant="outline"
            >
              <span className="text-lg">📱</span>
              <span className="text-xs">bKash/Nagad</span>
            </Button>

            <Button
              onClick={() => handlePayment("credit")}
              disabled={items.length === 0 || processing}
              className={cn(
                "h-14 rounded-xl font-semibold flex flex-col items-center justify-center gap-1",
                "bg-slate-700/50 border border-slate-600/50 text-slate-300",
                "hover:bg-slate-700/70 active:scale-95 transition-all"
              )}
              variant="outline"
            >
              <span className="text-lg">📝</span>
              <span className="text-xs">{i18n.language === "bn" ? "বাকি" : "Credit"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
