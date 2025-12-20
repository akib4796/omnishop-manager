import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Users,
    Package,
    AlertTriangle,
    Loader2,
    ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { getCustomers } from "@/integrations/appwrite/customers";
import { getPurchaseOrders } from "@/integrations/appwrite/inventory";
import { getLedgerEntries } from "@/integrations/appwrite/payments";
import { toBengaliNumerals } from "@/lib/i18n-utils";

interface AccountsOverviewProps {
    className?: string;
}

interface AgingBucket {
    label: string;
    amount: number;
    count: number;
    color: string;
}

export function AccountsOverview({ className }: AccountsOverviewProps) {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const tenantId = profile?.tenantId;
    const isBn = i18n.language === "bn";

    // Fetch customers for customer count
    const { data: customers, isLoading: loadingCustomers } = useQuery({
        queryKey: ["customers", tenantId],
        queryFn: () => tenantId ? getCustomers(tenantId) : Promise.resolve([]),
        enabled: !!tenantId,
    });

    // Fetch ledger entries to calculate AR (credit sales - customer payments)
    const { data: ledger, isLoading: loadingLedger } = useQuery({
        queryKey: ["payments", tenantId],
        queryFn: () => tenantId ? getLedgerEntries(tenantId) : Promise.resolve([]),
        enabled: !!tenantId,
    });

    // Fetch purchase orders for AP
    const { data: purchaseOrders, isLoading: loadingPOs } = useQuery({
        queryKey: ["purchaseOrders", tenantId],
        queryFn: () => tenantId ? getPurchaseOrders(tenantId) : Promise.resolve([]),
        enabled: !!tenantId,
    });

    // Calculate AR (Accounts Receivable) from ledger
    // AR = Credit Sales - Customer Payments
    const receivables = useMemo(() => {
        if (!ledger) return { total: 0, count: 0, byCustomer: new Map() };

        // Group by customer, calculate balance
        const customerBalances = new Map<string, { balance: number, lastDate: string }>();

        ledger.forEach((entry: any) => {
            // Only process entries with entityId (customer ID)
            if (!entry.entityId) return;

            if (entry.method === 'Credit' && entry.category === 'SALE') {
                // Credit sale -> increases AR
                const current = customerBalances.get(entry.entityId) || { balance: 0, lastDate: entry.date };
                current.balance += entry.amount;
                current.lastDate = entry.date;
                customerBalances.set(entry.entityId, current);
            } else if (entry.category === 'CUSTOMER_PAYMENT') {
                // Customer payment -> decreases AR
                const current = customerBalances.get(entry.entityId) || { balance: 0, lastDate: entry.date };
                current.balance -= entry.amount;
                current.lastDate = entry.date;
                customerBalances.set(entry.entityId, current);
            }
        });

        // Sum only positive balances
        let total = 0;
        let count = 0;
        customerBalances.forEach((data) => {
            if (data.balance > 0) {
                total += data.balance;
                count++;
            }
        });

        console.log('[AR] Calculated from ledger:', { total, count, entries: ledger.length });

        return { total, count, byCustomer: customerBalances };
    }, [ledger]);

    // Calculate AP (Accounts Payable) - money we owe suppliers
    const payables = useMemo(() => {
        if (!purchaseOrders) return { total: 0, count: 0, orders: [] };

        const unpaidOrPartial = purchaseOrders.filter((po: any) =>
            po.paymentStatus === 'not_paid' || po.paymentStatus === 'partially_paid'
        );

        const total = unpaidOrPartial.reduce((sum: number, po: any) => {
            const poTotal = po.totalCost || 0;
            const paid = po.amountPaid || 0;
            return sum + (poTotal - paid);
        }, 0);

        return {
            total,
            count: unpaidOrPartial.length,
            orders: unpaidOrPartial.slice(0, 5),
        };
    }, [purchaseOrders]);

    // Calculate aging buckets for AR from ledger
    const arAging = useMemo((): AgingBucket[] => {
        if (!ledger) return [];

        const now = new Date();
        const buckets = {
            current: { amount: 0, count: 0 },
            days30: { amount: 0, count: 0 },
            days60: { amount: 0, count: 0 },
            days90: { amount: 0, count: 0 },
        };

        // Group credit sales by customer and date
        receivables.byCustomer.forEach((data, customerId) => {
            if (data.balance <= 0) return;

            const lastDate = new Date(data.lastDate);
            const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 30) {
                buckets.current.amount += data.balance;
                buckets.current.count++;
            } else if (daysDiff <= 60) {
                buckets.days30.amount += data.balance;
                buckets.days30.count++;
            } else if (daysDiff <= 90) {
                buckets.days60.amount += data.balance;
                buckets.days60.count++;
            } else {
                buckets.days90.amount += data.balance;
                buckets.days90.count++;
            }
        });

        return [
            { label: "Current", amount: buckets.current.amount, count: buckets.current.count, color: "bg-green-500" },
            { label: "30-60 days", amount: buckets.days30.amount, count: buckets.days30.count, color: "bg-yellow-500" },
            { label: "60-90 days", amount: buckets.days60.amount, count: buckets.days60.count, color: "bg-orange-500" },
            { label: "90+ days", amount: buckets.days90.amount, count: buckets.days90.count, color: "bg-red-500" },
        ];
    }, [ledger, receivables.byCustomer]);

    const formatCurrency = (amount: number) => {
        const formatted = amount.toLocaleString();
        return isBn ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
    };

    const isLoading = loadingCustomers || loadingPOs || loadingLedger;

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 mb-6">
                {/* Accounts Receivable Card */}
                <Card className="border-green-200 dark:border-green-900">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ArrowDownLeft className="h-5 w-5 text-green-500" />
                                Accounts Receivable
                            </CardTitle>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                AR
                            </Badge>
                        </div>
                        <CardDescription>Money customers owe you</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                            {formatCurrency(receivables.total)}
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {receivables.count} customers with balance
                            </span>
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/customers">
                                    View All <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Accounts Payable Card */}
                <Card className="border-red-200 dark:border-red-900">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ArrowUpRight className="h-5 w-5 text-red-500" />
                                Accounts Payable
                            </CardTitle>
                            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                AP
                            </Badge>
                        </div>
                        <CardDescription>Money you owe suppliers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                            {formatCurrency(payables.total)}
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {payables.count} unpaid POs
                            </span>
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/inventory">
                                    View All <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Aging Report */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Receivables Aging
                    </CardTitle>
                    <CardDescription>Track overdue customer payments</CardDescription>
                </CardHeader>
                <CardContent>
                    {receivables.total === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                            No outstanding receivables
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {arAging.map((bucket, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${bucket.color}`} />
                                            {bucket.label}
                                            {bucket.count > 0 && (
                                                <span className="text-muted-foreground">
                                                    ({bucket.count} customers)
                                                </span>
                                            )}
                                        </span>
                                        <span className="font-medium">
                                            {formatCurrency(bucket.amount)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={receivables.total > 0 ? (bucket.amount / receivables.total) * 100 : 0}
                                        className="h-2"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Net Position */}
            <Card className="mt-4">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Net Position (AR - AP)</p>
                            <p className={`text-2xl font-bold ${receivables.total - payables.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(receivables.total - payables.total)}
                            </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                            {receivables.total > payables.total ? (
                                <span className="text-green-600">You are owed more than you owe</span>
                            ) : receivables.total < payables.total ? (
                                <span className="text-red-600">You owe more than you are owed</span>
                            ) : (
                                <span>Balanced</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
