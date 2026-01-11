import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
    ShoppingCart,
    CreditCard,
    Receipt,
    X,
    TrendingUp,
    TrendingDown,
    Wallet,
    ChevronDown,
    ChevronUp,
    Package,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getEntityLedger } from "@/integrations/appwrite/payments";
import { getCustomerSales } from "@/integrations/appwrite/sales";
import { getProducts } from "@/integrations/appwrite/products";
import { formatCurrency } from "@/lib/i18n-utils";
import { Button } from "@/components/ui/button";
import { ReceivePaymentModal } from "./ReceivePaymentModal";

interface CustomerDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: {
        $id: string;
        name: string;
        phone?: string;
        email?: string;
        priceTier?: string;
        creditLimit?: number;
    } | null;
    tenantId: string;
}

export function CustomerDetailsModal({
    open,
    onOpenChange,
    customer,
    tenantId,
}: CustomerDetailsModalProps) {
    const { t, i18n } = useTranslation();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
    const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any>(null);

    // Fetch ledger entries for this customer (for balance calculation)
    const { data: transactions, isLoading: loadingLedger } = useQuery({
        queryKey: ["customerLedger", tenantId, customer?.$id],
        queryFn: () => customer ? getEntityLedger(tenantId, customer.$id) : Promise.resolve([]),
        enabled: open && !!customer && !!tenantId,
    });

    console.log('[DEBUG] Customer Transactions:', transactions);

    // Extract sale IDs from transactions to help find sales that might have missing customerIds in saleData
    const matchedSaleIds = useMemo(() => {
        if (!transactions) return [];
        return transactions
            .filter((t: any) => t.category === 'SALE' && t.referenceId)
            .map((t: any) => t.referenceId);
    }, [transactions]);

    // Fetch customer sales with item details
    const { data: sales, isLoading: loadingSales } = useQuery({
        queryKey: ["customerSales", tenantId, customer?.$id, matchedSaleIds, transactions],
        queryFn: () => customer ? getCustomerSales(tenantId, customer.$id, matchedSaleIds, transactions) : Promise.resolve([]),
        enabled: open && !!customer && !!tenantId,
    });

    // Fetch products for name lookup
    const { data: products } = useQuery({
        queryKey: ["products", tenantId],
        queryFn: () => tenantId ? getProducts(tenantId) : Promise.resolve([]),
        enabled: open && !!tenantId,
    });

    // Create product name lookup map
    const productMap = useMemo(() => {
        const map = new Map<string, string>();
        if (products) {
            products.forEach((p: any) => map.set(p.$id, p.name));
        }
        return map;
    }, [products]);

    // Calculate totals from transactions
    const totals = useMemo(() => {
        if (!transactions) return { purchases: 0, payments: 0, balance: 0, debtPayments: 0 };

        let purchases = 0;      // Total sales to customer (all methods)
        let cashPayments = 0;   // Non-credit sales (cash, card, mobile at point of sale)
        let creditSales = 0;    // Credit sales only (goes to outstanding)
        let debtPayments = 0;   // Customer payments for clearing debt

        transactions.forEach((tx: any) => {
            if (tx.category === 'SALE') {
                purchases += tx.amount;
                if (tx.method === 'Credit') {
                    creditSales += tx.amount;
                } else {
                    // Cash/Card/Mobile payments at point of sale
                    cashPayments += tx.amount;
                }
            } else if (tx.category === 'CUSTOMER_PAYMENT') {
                // Payments made to clear existing debt
                debtPayments += tx.amount;
            }
        });

        return {
            purchases,
            payments: cashPayments + debtPayments, // All money received
            balance: creditSales - debtPayments,   // Outstanding = credit sales - debt payments
            debtPayments,  // Total debt payments for FIFO calculation
        };
    }, [transactions]);

    // Calculate per-sale paid amounts using FIFO
    // IMPORTANT: We calculate "totalShouldBePaid" as (sum of credit sales - outstanding)
    // This guarantees that sum of all dues = outstanding (proper tally)
    const salePaymentMap = useMemo(() => {
        const map = new Map<string, { paid: number; due: number }>();
        if (!sales || sales.length === 0) return map;

        // Get only credit sales, sorted oldest first (FIFO)
        const creditSalesFiltered = sales
            .filter((s: any) => s.saleData.paymentMethod === 'credit')
            .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Calculate total credit sales amount from sales collection
        const totalCreditSalesAmount = creditSalesFiltered.reduce(
            (sum: number, sale: any) => sum + sale.saleData.total,
            0
        );

        // Calculate how much SHOULD be paid = total credit sales - outstanding
        // This ensures: sum of all dues = outstanding (totals.balance)
        const totalShouldBePaid = Math.max(0, totalCreditSalesAmount - totals.balance);

        // Allocate paid amount across credit sales (oldest first - FIFO)
        let remainingToAllocate = totalShouldBePaid;

        creditSalesFiltered.forEach((sale: any) => {
            const saleTotal = sale.saleData.total;
            const paid = Math.min(remainingToAllocate, saleTotal);
            const due = saleTotal - paid;

            map.set(sale.$id, { paid, due });
            remainingToAllocate -= paid;
        });

        return map;
    }, [sales, totals.balance]);

    if (!customer) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{customer.name}</h2>
                                <p className="text-sm text-muted-foreground font-normal">
                                    {customer.phone || "No phone"}
                                    {customer.priceTier && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            {customer.priceTier}
                                        </Badge>
                                    )}
                                </p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3 my-4">
                        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                    <ShoppingCart className="h-4 w-4" />
                                    <span className="text-xs font-medium">Total Purchases</span>
                                </div>
                                <p className="text-xl font-bold">
                                    {formatCurrency(totals.purchases, i18n.language)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                                    <Wallet className="h-4 w-4" />
                                    <span className="text-xs font-medium">Payments Received</span>
                                </div>
                                <p className="text-xl font-bold">
                                    {formatCurrency(totals.payments, i18n.language)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className={`bg-gradient-to-br ${totals.balance > 0 ? 'from-amber-500/10 to-amber-600/5 border-amber-500/20' : 'from-gray-500/10 to-gray-600/5 border-gray-500/20'}`}>
                            <CardContent className="p-4">
                                <div className={`flex items-center gap-2 mb-1 ${totals.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                    <CreditCard className="h-4 w-4" />
                                    <span className="text-xs font-medium">Outstanding</span>
                                </div>
                                <p className={`text-xl font-bold ${totals.balance > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                    {formatCurrency(totals.balance, i18n.language)}
                                </p>
                                {totals.balance > 0 && (
                                    <Button
                                        size="sm"
                                        className="mt-2 w-full bg-green-600 hover:bg-green-700 text-xs h-7"
                                        onClick={() => setShowPaymentModal(true)}
                                    >
                                        <Wallet className="h-3 w-3 mr-1" />
                                        {i18n.language === 'bn' ? 'পেমেন্ট গ্রহণ' : 'Receive Payment'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Credit Limit Info */}
                    {customer.creditLimit !== undefined && customer.creditLimit > 0 && (
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg text-sm mb-3">
                            <span className="text-muted-foreground">Credit Limit:</span>
                            <span className="font-medium">{formatCurrency(customer.creditLimit, i18n.language)}</span>
                            <span className={`text-xs ${totals.balance > customer.creditLimit ? 'text-red-500' : 'text-green-500'}`}>
                                {totals.balance > customer.creditLimit ? '⚠️ Over limit' : '✓ Within limit'}
                            </span>
                        </div>
                    )}

                    <Separator />

                    {/* Transaction History - Sales with Items */}
                    <div className="flex-1 min-h-0">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Receipt className="h-4 w-4" />
                            {i18n.language === 'bn' ? 'লেনদেন ইতিহাস' : 'Transaction History'}
                        </h3>

                        {(loadingSales || loadingLedger) ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                            </div>
                        ) : !sales || sales.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {i18n.language === 'bn' ? 'কোন লেনদেন নেই' : 'No transactions found for this customer'}
                            </div>
                        ) : (
                            <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-2">
                                    {sales.map((sale: any) => {
                                        const isExpanded = expandedSaleId === sale.$id;
                                        const isCredit = sale.saleData.paymentMethod === 'credit';

                                        return (
                                            <div key={sale.$id} className="border rounded-lg overflow-hidden">
                                                {/* Sale Header - Clickable */}
                                                <div
                                                    className={`p-3 cursor-pointer transition-colors ${isExpanded ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                                                    onClick={() => setExpandedSaleId(isExpanded ? null : sale.$id)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'}`}>
                                                                <ShoppingCart className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium flex items-center gap-2">
                                                                    {i18n.language === 'bn' ? 'বিক্রয়' : 'Sale'}
                                                                    <Badge variant={isCredit ? "destructive" : "secondary"} className="text-xs">
                                                                        {isCredit ? (i18n.language === 'bn' ? 'বাকি' : 'Credit') : sale.saleData.paymentMethod}
                                                                    </Badge>
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {format(new Date(sale.createdAt), 'MMM d, yyyy h:mm a')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-right">
                                                                <p className="font-bold text-blue-500">
                                                                    {formatCurrency(sale.saleData.total, i18n.language)}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {sale.saleData.items?.length || 0} {i18n.language === 'bn' ? 'আইটেম' : 'items'}
                                                                </p>
                                                            </div>
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <div className="border-t bg-muted/20 p-3 space-y-3">
                                                        {/* Items List */}
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                                <Package className="h-3 w-3" />
                                                                {i18n.language === 'bn' ? 'আইটেম' : 'Items'}
                                                            </p>
                                                            {sale.saleData.items?.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between text-sm bg-background/50 p-2 rounded">
                                                                    <span>{item.quantity}x {productMap.get(item.productId) || 'Unknown Product'}</span>
                                                                    <span className="font-medium">৳{(item.price * item.quantity).toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Sale Summary */}
                                                        <div className="text-sm space-y-1 pt-2 border-t">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">{i18n.language === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
                                                                <span>৳{sale.saleData.subtotal?.toLocaleString()}</span>
                                                            </div>
                                                            {sale.saleData.discount > 0 && (
                                                                <div className="flex justify-between text-red-500">
                                                                    <span>{i18n.language === 'bn' ? 'ছাড়' : 'Discount'}</span>
                                                                    <span>-৳{sale.saleData.discount?.toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between font-bold">
                                                                <span>{i18n.language === 'bn' ? 'মোট' : 'Total'}</span>
                                                                <span>৳{sale.saleData.total?.toLocaleString()}</span>
                                                            </div>

                                                            {/* Paid/Due for credit sales */}
                                                            {isCredit && (() => {
                                                                const paymentInfo = salePaymentMap.get(sale.$id) || { paid: 0, due: sale.saleData.total };
                                                                return (
                                                                    <>
                                                                        <div className="flex justify-between text-green-600">
                                                                            <span>{i18n.language === 'bn' ? 'পরিশোধিত' : 'Paid'}</span>
                                                                            <span>৳{paymentInfo.paid.toLocaleString()}</span>
                                                                        </div>
                                                                        <div className={`flex justify-between font-bold ${paymentInfo.due > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                                                            <span>{i18n.language === 'bn' ? 'বাকি' : 'Due'}</span>
                                                                            <span>
                                                                                {paymentInfo.due > 0
                                                                                    ? `৳${paymentInfo.due.toLocaleString()}`
                                                                                    : '✓ Paid'
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Repay Button for Credit Sales - only if not fully paid */}
                                                        {isCredit && (() => {
                                                            const paymentInfo = salePaymentMap.get(sale.$id) || { paid: 0, due: sale.saleData.total };
                                                            return paymentInfo.due > 0 ? (
                                                                <Button
                                                                    size="sm"
                                                                    className="w-full bg-green-600 hover:bg-green-700"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedSaleForPayment(sale);
                                                                        setShowPaymentModal(true);
                                                                    }}
                                                                >
                                                                    <Wallet className="h-4 w-4 mr-2" />
                                                                    {i18n.language === 'bn' ? 'পেমেন্ট গ্রহণ করুন' : 'Receive Payment'}
                                                                </Button>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Receive Payment Modal */}
            <ReceivePaymentModal
                open={showPaymentModal}
                onOpenChange={setShowPaymentModal}
                customer={customer}
                tenantId={tenantId}
                outstandingAmount={
                    selectedSaleForPayment
                        ? (salePaymentMap.get(selectedSaleForPayment.$id)?.due || 0)
                        : totals.balance
                }
            />
        </>
    );
}
