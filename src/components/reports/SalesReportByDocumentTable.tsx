import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import * as XLSX from 'xlsx';

interface SalesReportByDocumentTableProps {
    sales: any[]; // Synced sales data
    staffMembers: any[];
}

export function SalesReportByDocumentTable({ sales, staffMembers }: SalesReportByDocumentTableProps) {
    const { t, i18n } = useTranslation();
    const [searchTerm, setSearchTerm] = useState("");

    const formatPrice = (price: number) => {
        const formatted = price.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(i18n.language === 'bn' ? 'bn-BD' : 'en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Flatten sales into line items
    const reportData = useMemo(() => {
        const flattened: any[] = [];
        sales.forEach(sale => {
            const items = sale.saleData?.items || [];
            const cashier = staffMembers.find(s => s.userId === sale.saleData?.cashierId)?.fullName || 'Unknown';

            items.forEach((item: any) => {
                const revenue = (item.price || 0) * (item.quantity || 0);
                const cost = (item.costPrice || 0) * (item.quantity || 0);
                const gp = revenue - cost;
                const margin = revenue > 0 ? (gp / revenue) * 100 : 0;

                flattened.push({
                    id: sale.$id, // Sale ID
                    itemId: item.productId,
                    date: sale.createdAt || sale.saleData?.completedAt,
                    docNo: sale.$id.substring(0, 8).toUpperCase(), // Short ID for display
                    customer: sale.saleData?.customerName || 'Walk-in',
                    salesman: cashier,
                    productName: item.name || item.productName || 'Unknown Item',
                    quantity: item.quantity || 0,
                    unitPrice: item.price || 0,
                    unitCost: item.costPrice || 0,
                    totalRevenue: revenue,
                    totalCost: cost,
                    grossProfit: gp,
                    margin: margin,
                    hasCost: !!item.costPrice
                });
            });
        });

        // Sort by date desc
        return flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, staffMembers]);

    // Filter
    const filteredData = useMemo(() => {
        if (!searchTerm) return reportData;
        const lower = searchTerm.toLowerCase();
        return reportData.filter(row =>
            row.docNo.toLowerCase().includes(lower) ||
            row.customer.toLowerCase().includes(lower) ||
            row.productName.toLowerCase().includes(lower) ||
            row.salesman.toLowerCase().includes(lower)
        );
    }, [reportData, searchTerm]);

    // Aggregations
    const totals = useMemo(() => {
        return filteredData.reduce((acc, row) => ({
            quantity: acc.quantity + row.quantity,
            revenue: acc.revenue + row.totalRevenue,
            cost: acc.cost + row.totalCost,
            gp: acc.gp + row.grossProfit
        }), { quantity: 0, revenue: 0, cost: 0, gp: 0 });
    }, [filteredData]);

    const totalMargin = totals.revenue > 0 ? (totals.gp / totals.revenue) * 100 : 0;

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(filteredData.map(row => ({
            Date: new Date(row.date).toLocaleDateString(),
            'Doc No': row.docNo,
            Customer: row.customer,
            Salesman: row.salesman,
            Item: row.productName,
            Qty: row.quantity,
            'Unit Price': row.unitPrice,
            'Total Revenue': row.totalRevenue,
            'Unit Cost': row.unitCost,
            'Total Cost': row.totalCost,
            'Gross Profit': row.grossProfit,
            'Margin %': `${row.margin.toFixed(2)}%`
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
        XLSX.writeFile(wb, "Sales_Report_By_Document.xlsx");
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Sales Report (By Item)
                    </CardTitle>
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search doc, item, customer..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={handleExport} title="Export to Excel">
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px]">
                    <Table>
                        <TableHeader className="sticky top-0 bg-secondary">
                            <TableRow>
                                <TableHead className="w-[100px]">Date</TableHead>
                                <TableHead>Doc No</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Rev</TableHead>
                                <TableHead className="text-right hidden md:table-cell">Cost</TableHead>
                                <TableHead className="text-right hidden md:table-cell">GP</TableHead>
                                <TableHead className="text-right hidden md:table-cell">%</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        No sales data found matching your filter.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((row, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/50">
                                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                            {formatDate(row.date)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{row.docNo}</TableCell>
                                        <TableCell className="text-xs truncate max-w-[100px]" title={row.customer}>{row.customer}</TableCell>
                                        <TableCell className="text-xs font-medium truncate max-w-[150px]" title={row.productName}>{row.productName}</TableCell>
                                        <TableCell className="text-right text-xs">{row.quantity}</TableCell>
                                        <TableCell className="text-right text-xs">{formatPrice(row.unitPrice)}</TableCell>
                                        <TableCell className="text-right text-xs font-bold">{formatPrice(row.totalRevenue)}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground hidden md:table-cell">
                                            {!row.hasCost && <AlertTriangle className="h-3 w-3 inline text-amber-500 mr-1" />}
                                            {formatPrice(row.totalCost)}
                                        </TableCell>
                                        <TableCell className={`text-right text-xs font-bold hidden md:table-cell ${row.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatPrice(row.grossProfit)}
                                        </TableCell>
                                        <TableCell className={`text-right text-xs hidden md:table-cell ${row.margin >= 20 ? 'text-green-600' : row.margin > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                            {row.margin.toFixed(1)}%
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-secondary font-bold">
                            <TableRow>
                                <TableCell colSpan={4}>Total</TableCell>
                                <TableCell className="text-right">{totals.quantity}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">{formatPrice(totals.revenue)}</TableCell>
                                <TableCell className="text-right hidden md:table-cell">{formatPrice(totals.cost)}</TableCell>
                                <TableCell className="text-right hidden md:table-cell text-green-700">{formatPrice(totals.gp)}</TableCell>
                                <TableCell className="text-right hidden md:table-cell">{totalMargin.toFixed(1)}%</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
