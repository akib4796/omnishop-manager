import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/i18n-utils";
import { differenceInDays } from "date-fns";

interface Payment {
    $id: string;
    type: string;
    category: string;
    amount: number;
    date: string;
    entityId: string;
    method: string;
}

interface Supplier {
    $id: string;
    name: string;
    phone?: string;
}

interface SupplierAgingReportProps {
    ledger: Payment[];
    suppliers: Supplier[];
}

interface SupplierAging {
    id: string;
    name: string;
    phone?: string;
    totalDue: number;
    days30: number;
    days60: number;
    days90: number;
    days90plus: number;
}

export function SupplierAgingReport({ ledger, suppliers }: SupplierAgingReportProps) {
    const { i18n } = useTranslation();

    const agingData = useMemo(() => {
        const report: SupplierAging[] = [];
        const now = new Date();

        suppliers.forEach(supplier => {
            // Get all transactions for this supplier
            const supplierTrans = ledger.filter(t => t.entityId === supplier.$id);

            // Purchases on credit (Increases Payable)
            const purchases = supplierTrans
                .filter(t => t.category === 'PURCHASE' && t.method.toLowerCase() === 'credit')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Payments made (Decreases Payable)
            const payments = supplierTrans
                .filter(t => t.category === 'SUPPLIER_PAYMENT')
                .reduce((sum, t) => sum + t.amount, 0);

            let remainingPayment = payments;
            const outstandingInvoices: { amount: number, date: string }[] = [];

            // FIFO Matching
            for (const purchase of purchases) {
                if (remainingPayment >= purchase.amount) {
                    remainingPayment -= purchase.amount;
                } else {
                    outstandingInvoices.push({
                        amount: purchase.amount - remainingPayment,
                        date: purchase.date
                    });
                    remainingPayment = 0;
                }
            }

            // Bucket the outstanding amounts
            let days30 = 0, days60 = 0, days90 = 0, days90plus = 0;
            let totalDue = 0;

            outstandingInvoices.forEach(inv => {
                totalDue += inv.amount;
                const days = differenceInDays(now, new Date(inv.date));

                if (days <= 30) days30 += inv.amount;
                else if (days <= 60) days60 += inv.amount;
                else if (days <= 90) days90 += inv.amount;
                else days90plus += inv.amount;
            });

            if (totalDue > 0) {
                report.push({
                    id: supplier.$id,
                    name: supplier.name,
                    phone: supplier.phone,
                    totalDue,
                    days30,
                    days60,
                    days90,
                    days90plus
                });
            }
        });

        return report.sort((a, b) => b.totalDue - a.totalDue);
    }, [ledger, suppliers]);

    if (agingData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Accounts Payable Aging</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-8">No outstanding supplier debts found.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Accounts Payable Aging (What You Owe)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead className="text-right">1-30 Days</TableHead>
                                <TableHead className="text-right">31-60 Days</TableHead>
                                <TableHead className="text-right">61-90 Days</TableHead>
                                <TableHead className="text-right text-red-500">90+ Days</TableHead>
                                <TableHead className="text-right font-bold">Total Owed</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agingData.map(row => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <div className="font-medium">{row.name}</div>
                                        {row.phone && <div className="text-xs text-muted-foreground">{row.phone}</div>}
                                    </TableCell>
                                    <TableCell className="text-right">{row.days30 > 0 ? formatCurrency(row.days30, i18n.language) : '-'}</TableCell>
                                    <TableCell className="text-right">{row.days60 > 0 ? formatCurrency(row.days60, i18n.language) : '-'}</TableCell>
                                    <TableCell className="text-right">{row.days90 > 0 ? formatCurrency(row.days90, i18n.language) : '-'}</TableCell>
                                    <TableCell className="text-right text-red-500 font-medium">{row.days90plus > 0 ? formatCurrency(row.days90plus, i18n.language) : '-'}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(row.totalDue, i18n.language)}</TableCell>
                                </TableRow>
                            ))}
                            {/* Summary Totals Row */}
                            <TableRow className="bg-muted/50 font-bold border-t-2">
                                <TableCell>TOTALS ({agingData.length} Suppliers)</TableCell>
                                <TableCell className="text-right">{formatCurrency(agingData.reduce((s, r) => s + r.days30, 0), i18n.language)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(agingData.reduce((s, r) => s + r.days60, 0), i18n.language)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(agingData.reduce((s, r) => s + r.days90, 0), i18n.language)}</TableCell>
                                <TableCell className="text-right text-red-500">{formatCurrency(agingData.reduce((s, r) => s + r.days90plus, 0), i18n.language)}</TableCell>
                                <TableCell className="text-right text-lg">{formatCurrency(agingData.reduce((s, r) => s + r.totalDue, 0), i18n.language)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
