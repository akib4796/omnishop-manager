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

interface Customer {
    $id: string;
    name: string;
    phone: string;
}

interface AgingReportProps {
    ledger: Payment[];
    customers: Customer[];
}

interface CustomerAging {
    id: string;
    name: string;
    phone: string;
    totalDue: number;
    days30: number; // 0-30 days
    days60: number; // 31-60 days
    days90: number; // 61-90 days
    days90plus: number; // 91+ days
}

export function AgingReport({ ledger, customers }: AgingReportProps) {
    const { i18n } = useTranslation();

    const agingData = useMemo(() => {
        const report: CustomerAging[] = [];
        const now = new Date();

        customers.forEach(customer => {
            // 1. Get all transactions for this customer
            const custTrans = ledger.filter(t => t.entityId === customer.$id);

            // 2. Separate Debits (Sales) and Credits (Payments)
            // Assumption: SALE = Debit (Increases Debt), PAYMENT = Credit (Decreases Debt)
            // We rely on 'type' from Payments collection: 'IN' (Revenue) vs 'OUT' (Expense) isn't strictly Debit/Credit for AR.
            // Logic:
            // SALE (Credit Method) -> Increases AR. (This is usually recorded as 'IN' in Payments but method='Credit')
            // PAYMENT (Cash Method) -> Decreases AR.

            // Wait, my Ledger logic in PaymentPanel was:
            // Sale (Credit): Type=IN, Category=SALE, Method=Credit.
            // This means "Revenue IN", but it's "Receivable".

            // Payment (Cash): Type=IN, Category=CUSTOMER_PAYMENT, Method=Cash.
            // This logic in `payments.ts` was:
            // Balance = Sum(SALE & Credit) - Sum(CUSTOMER_PAYMENT)

            const sales = custTrans
                .filter(t => t.category === 'SALE' && t.method.toLowerCase() === 'credit')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Oldest first

            const payments = custTrans
                .filter(t => t.category === 'CUSTOMER_PAYMENT' || t.category === 'ADJUSTMENT_CREDIT') // Assuming adjustments might exist
                .reduce((sum, t) => sum + t.amount, 0);

            let remainingPayment = payments;
            const outstandingInvoices: { amount: number, date: string }[] = [];

            // 3. FIFO Matching
            // Apply payments to oldest sales first
            for (const sale of sales) {
                if (remainingPayment >= sale.amount) {
                    remainingPayment -= sale.amount;
                    // Paid in full
                } else {
                    // Partially paid or unpaid
                    outstandingInvoices.push({
                        amount: sale.amount - remainingPayment,
                        date: sale.date
                    });
                    remainingPayment = 0; // All payment used
                }
            }

            // 4. Bucket the outstanding amounts
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

            if (totalDue > 0) { // Only show if they owe money (or small threshold?)
                report.push({
                    id: customer.$id,
                    name: customer.name,
                    phone: customer.phone,
                    totalDue,
                    days30,
                    days60,
                    days90,
                    days90plus
                });
            }
        });

        return report.sort((a, b) => b.totalDue - a.totalDue);
    }, [ledger, customers]);

    if (agingData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Accounts Receivable Aging</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-8">No overdue debts found.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Accounts Receivable Aging (Overdue Debts)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead className="text-right">1-30 Days</TableHead>
                                <TableHead className="text-right">31-60 Days</TableHead>
                                <TableHead className="text-right">61-90 Days</TableHead>
                                <TableHead className="text-right text-red-500">90+ Days</TableHead>
                                <TableHead className="text-right font-bold">Total Due</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agingData.map(row => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <div className="font-medium">{row.name}</div>
                                        <div className="text-xs text-muted-foreground">{row.phone}</div>
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
                                <TableCell>TOTALS ({agingData.length} Customers)</TableCell>
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
