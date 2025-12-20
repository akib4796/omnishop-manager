import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    Wallet,
    Landmark,
    Vault,
    Smartphone,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    CreditCard,
    RefreshCw
} from "lucide-react";
import { format } from "date-fns";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileNavSheet } from "@/components/MobileNavSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/i18n-utils";
import { WalletCard } from "@/components/accounting/WalletCard";
import { ExpenseDialog } from "@/components/accounting/ExpenseDialog";
import { TransferModal } from "@/components/accounting/TransferModal";
import { OpeningBalanceModal } from "@/components/accounting/OpeningBalanceModal";
import { WalletManager } from "@/components/accounting/WalletManager";
import { AccountsOverview } from "@/components/accounting/AccountsOverview";

import { getExpenses, deleteExpense } from "@/integrations/appwrite/expenses";
import { getLedgerEntries } from "@/integrations/appwrite/payments";
import { getFiscalYears, getCurrentFiscalYear } from "@/integrations/appwrite/accounting";

export default function Accounting() {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const tenantId = profile?.tenantId;

    const [activeTab, setActiveTab] = useState("overview");
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);

    // Queries
    const { data: expenses, isLoading: loadingExpenses } = useQuery({
        queryKey: ["expenses", tenantId],
        queryFn: () => tenantId ? getExpenses(tenantId) : Promise.resolve([]),
        enabled: !!tenantId
    });

    const { data: ledger, isLoading: loadingLedger } = useQuery({
        queryKey: ["payments", tenantId],
        queryFn: () => tenantId ? getLedgerEntries(tenantId) : Promise.resolve([]),
        enabled: !!tenantId
    });

    // Debug: Log ledger data
    useEffect(() => {
        console.log("[Accounting] tenantId:", tenantId);
        console.log("[Accounting] Ledger entries:", ledger?.length || 0, "entries", ledger);
    }, [tenantId, ledger]);

    const { data: fiscalYear } = useQuery({
        queryKey: ["fiscalYear", tenantId],
        queryFn: () => tenantId ? getCurrentFiscalYear(tenantId) : Promise.resolve(null),
        enabled: !!tenantId
    });

    // Calculations
    const metrics = useMemo(() => {
        if (!ledger) return { cash: 0, bank: 0, mobile: 0, safe: 0, totalIn: 0, totalOut: 0 };

        let cash = 0, bank = 0, mobile = 0, safe = 0;
        let totalIn = 0, totalOut = 0;

        ledger.forEach(entry => {
            const val = entry.type === 'IN' ? entry.amount : -entry.amount;

            // Update method balances
            if (entry.method === 'Cash') cash += val;
            else if (entry.method === 'Bank Transfer' || entry.method === 'Credit Card') bank += val;
            else if (entry.method === 'Mobile Money') mobile += val;

            // Totals
            if (entry.type === 'IN') totalIn += entry.amount;
            else totalOut += entry.amount;
        });

        return { cash, bank, mobile, safe, totalIn, totalOut };
    }, [ledger]);

    const recentTransactions = useMemo(() => {
        return ledger?.slice(0, 10) || [];
    }, [ledger]);

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <MobileNavSheet title="Accounting" />

                <div className="p-4 md:p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
                            <p className="text-muted-foreground">
                                {fiscalYear ? `Fiscal Year: ${fiscalYear.name}` : "Current Financial Status"}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
                            <Button variant="outline" onClick={() => setIsOpeningBalanceModalOpen(true)}>
                                <Wallet className="mr-2 h-4 w-4" /> Set Balances
                            </Button>
                            <Button variant="outline" onClick={() => setIsTransferModalOpen(true)}>
                                <ArrowUpRight className="mr-2 h-4 w-4" /> Transfer
                            </Button>
                            <Button onClick={() => setIsExpenseDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Add Expense
                            </Button>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="receivables">Receivables</TabsTrigger>
                            <TabsTrigger value="wallets">Wallets</TabsTrigger>
                            <TabsTrigger value="expenses">Expenses</TabsTrigger>
                            <TabsTrigger value="ledger">Cashbook</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                            {/* Wallet Cards */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <WalletCard
                                    title="Cash Drawer"
                                    balance={metrics.cash}
                                    icon={Wallet}
                                    trend={2.5}
                                />
                                <WalletCard
                                    title="Bank Accounts"
                                    balance={metrics.bank}
                                    icon={Landmark}
                                    trend={12.0}
                                />
                                <WalletCard
                                    title="Mobile Money"
                                    balance={metrics.mobile}
                                    icon={Smartphone}
                                />
                                <WalletCard
                                    title="Office Safe"
                                    balance={metrics.safe}
                                    icon={Vault}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                                {/* Recent Transactions */}
                                <Card className="col-span-4">
                                    <CardHeader>
                                        <CardTitle>Recent Transactions</CardTitle>
                                        <CardDescription>Latest 10 financial movements</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recentTransactions.map((t) => (
                                                    <TableRow key={t.$id}>
                                                        <TableCell>{format(new Date(t.date), "MMM d")}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{t.category}</span>
                                                                <span className="text-xs text-muted-foreground">{t.method}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className={t.type === 'IN' ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                                            {t.type === 'IN' ? '+' : '-'}{formatCurrency(t.amount, i18n.language)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={t.type === 'IN' ? "outline" : "secondary"}>
                                                                {t.type}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* Quick Stats */}
                                <Card className="col-span-3">
                                    <CardHeader>
                                        <CardTitle>Performance</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-8">
                                        <div className="flex items-center">
                                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center mr-4">
                                                <ArrowUpRight className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium leading-none">Total Revenue</p>
                                                <p className="text-2xl font-bold">{formatCurrency(metrics.totalIn, i18n.language)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center mr-4">
                                                <ArrowDownRight className="h-5 w-5 text-red-600" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium leading-none">Total Outflow</p>
                                                <p className="text-2xl font-bold">{formatCurrency(metrics.totalOut, i18n.language)}</p>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold">Net Profit</span>
                                                <span className={metrics.totalIn - metrics.totalOut >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                                    {formatCurrency(metrics.totalIn - metrics.totalOut, i18n.language)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="receivables">
                            <AccountsOverview />
                        </TabsContent>

                        <TabsContent value="wallets">
                            <WalletManager />
                        </TabsContent>

                        <TabsContent value="expenses">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Expense Register</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Paid By</TableHead>
                                                <TableHead>Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {expenses?.map(exp => (
                                                <TableRow key={exp.$id}>
                                                    <TableCell>{format(new Date(exp.date), "MMM d, yyyy")}</TableCell>
                                                    <TableCell>{exp.category}</TableCell>
                                                    <TableCell>{exp.description || '-'}</TableCell>
                                                    <TableCell>{exp.paidBy}</TableCell>
                                                    <TableCell className="font-medium text-red-600">
                                                        -{formatCurrency(exp.amount, i18n.language)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!expenses || expenses.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                        No expenses recorded
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="ledger">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cashbook & Ledger</CardTitle>
                                    <CardDescription>Full history of every transaction</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {/* Reusing Recent Transactions logic but full table. 
                        Ideally would be paginated and filterable. 
                        For now, just listing all up to limit of getLedgerEntries (default limit).
                    */}
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ID</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Method</TableHead>
                                                <TableHead className="text-right">Debit / Credit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ledger?.map((t) => (
                                                <TableRow key={t.$id}>
                                                    <TableCell className="font-mono text-xs">{t.$id.substring(0, 6)}...</TableCell>
                                                    <TableCell>{format(new Date(t.date), "yyyy-MM-dd HH:mm")}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{t.category}</Badge>
                                                    </TableCell>
                                                    <TableCell>{t.method}</TableCell>
                                                    <TableCell className={t.type === 'IN' ? "text-right text-green-600" : "text-right text-red-600"}>
                                                        {t.type === 'IN' ? '+' : '-'}{formatCurrency(t.amount, i18n.language)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <ExpenseDialog
                    open={isExpenseDialogOpen}
                    onOpenChange={setIsExpenseDialogOpen}
                />

                <TransferModal
                    open={isTransferModalOpen}
                    onOpenChange={setIsTransferModalOpen}
                    walletBalances={metrics}
                />

                <OpeningBalanceModal
                    open={isOpeningBalanceModalOpen}
                    onOpenChange={setIsOpeningBalanceModalOpen}
                />

            </SidebarInset>
        </SidebarProvider>
    );
}
