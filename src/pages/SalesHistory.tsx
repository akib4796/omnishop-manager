import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileNavSheet } from "@/components/MobileNavSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Eye, RefreshCw } from "lucide-react";
import { formatCurrency, toBengaliNumerals } from "@/lib/i18n-utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { getCompletedSales, CompletedSale } from "@/integrations/appwrite/salesHistory";

export default function SalesHistory() {
  const { t, i18n } = useTranslation();
  const { profile, isLoading: authLoading } = useAuth();
  const tenantId = profile?.tenantId;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<CompletedSale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["completed-sales", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getCompletedSales(tenantId);
    },
    enabled: !!tenantId,
  });

  const filteredSales = sales?.filter((sale) =>
    sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.$id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    if (!sales || sales.length === 0) return;

    const headers = [
      "Date",
      "Sale ID",
      "Customer",
      "Total",
      "Payment Method",
    ];

    const rows = sales.map((s) => [
      format(new Date(s.createdAt), "yyyy-MM-dd HH:mm"),
      s.$id,
      s.customerName || "Walk-in",
      s.totalAmount,
      s.paymentMethod,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${new Date().toISOString()}.csv`;
    a.click();
  };

  const handleViewReceipt = (sale: CompletedSale) => {
    setSelectedSale(sale);
    setIsReceiptOpen(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodLabels: Record<string, string> = {
      cash: t("salesHistory.cash"),
      card: t("salesHistory.card"),
      bkash: t("salesHistory.bkash"),
      nagad: t("salesHistory.nagad"),
    };
    return methodLabels[method] || method;
  };

  if (authLoading || !tenantId) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="p-6 flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile Header with Navigation */}
        <MobileNavSheet title={t("salesHistory.title")} />

        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="hidden md:block text-xl md:text-3xl font-bold">{t("salesHistory.title")}</h1>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("common.export")}</span>
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("salesHistory.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSales && filteredSales.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("salesHistory.saleId")}</TableHead>
                    <TableHead>{t("pos.customer")}</TableHead>
                    <TableHead>{t("common.total")}</TableHead>
                    <TableHead>{t("salesHistory.paymentMethod")}</TableHead>
                    <TableHead>{t("common.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.$id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        {i18n.language === "bn"
                          ? toBengaliNumerals(format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm"))
                          : format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sale.$id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{sale.customerName || t("pos.walkIn")}</TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(sale.totalAmount, i18n.language)}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReceipt(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t("salesHistory.noSales")}
            </div>
          )}

          <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("pos.receipt.title")}</DialogTitle>
              </DialogHeader>
              {selectedSale && (
                <div className="space-y-4">
                  <div className="text-center border-b pb-4">
                    <h2 className="text-xl font-bold">{t("appName")}</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedSale.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t("pos.customer")}:</span>
                      <span>{selectedSale.customerName || t("pos.walkIn")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("salesHistory.paymentMethod")}:</span>
                      <span>{getPaymentMethodLabel(selectedSale.paymentMethod)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    {selectedSale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm mb-2">
                        <span>
                          {item.name} x {item.qty}
                        </span>
                        <span>{formatCurrency(item.price * item.qty, i18n.language)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>{t("pos.subtotal")}:</span>
                      <span>
                        {formatCurrency(selectedSale.subtotal, i18n.language)}
                      </span>
                    </div>
                    {selectedSale.discountAmount > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>{t("pos.discount")}:</span>
                        <span>-{formatCurrency(selectedSale.discountAmount, i18n.language)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t("pos.tax")}:</span>
                      <span>{formatCurrency(selectedSale.taxAmount, i18n.language)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>{t("common.total")}:</span>
                      <span>{formatCurrency(selectedSale.totalAmount, i18n.language)}</span>
                    </div>
                  </div>
                  <Button onClick={handlePrintReceipt} className="w-full">
                    {t("pos.printReceipt")}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
