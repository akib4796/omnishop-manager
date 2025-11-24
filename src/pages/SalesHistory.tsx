import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Eye } from "lucide-react";
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

export default function SalesHistory() {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, customers(name), profiles(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredSales = sales?.filter((sale) =>
    sale.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    if (!sales || sales.length === 0) return;

    const headers = [
      "Date",
      "Sale ID",
      "Customer",
      "Total",
      "Payment Method",
      "Cashier",
    ];

    const rows = sales.map((s) => [
      format(new Date(s.created_at), "yyyy-MM-dd HH:mm"),
      s.id,
      s.customers?.name || "Walk-in",
      s.total_amount,
      s.payment_method,
      s.profiles?.full_name || "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${new Date().toISOString()}.csv`;
    a.click();
  };

  const handleViewReceipt = (sale: any) => {
    setSelectedSale(sale);
    setIsReceiptOpen(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t("salesHistory.title")}</h1>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              {t("common.export")}
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
            <p>{t("common.loading")}</p>
          ) : filteredSales && filteredSales.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("salesHistory.saleId")}</TableHead>
                    <TableHead>{t("pos.customer")}</TableHead>
                    <TableHead>{t("common.total")}</TableHead>
                    <TableHead>{t("salesHistory.paymentMethod")}</TableHead>
                    <TableHead>{t("salesHistory.cashier")}</TableHead>
                    <TableHead>{t("common.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        {i18n.language === "bn"
                          ? toBengaliNumerals(format(new Date(sale.created_at), "dd/MM/yyyy HH:mm"))
                          : format(new Date(sale.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sale.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{sale.customers?.name || t("pos.walkIn")}</TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(sale.total_amount, i18n.language)}
                      </TableCell>
                      <TableCell>
                        {sale.payment_method === "cash" && t("salesHistory.cash")}
                        {sale.payment_method === "card" && t("salesHistory.card")}
                        {sale.payment_method === "bkash" && t("salesHistory.bkash")}
                        {sale.payment_method === "nagad" && t("salesHistory.nagad")}
                        {!["cash", "card", "bkash", "nagad"].includes(sale.payment_method) && sale.payment_method}
                      </TableCell>
                      <TableCell>{sale.profiles?.full_name || "N/A"}</TableCell>
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
                      {format(new Date(selectedSale.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t("pos.customer")}:</span>
                      <span>{selectedSale.customers?.name || t("pos.walkIn")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("salesHistory.paymentMethod")}:</span>
                      <span>
                        {selectedSale.payment_method === "cash" && t("salesHistory.cash")}
                        {selectedSale.payment_method === "card" && t("salesHistory.card")}
                        {selectedSale.payment_method === "bkash" && t("salesHistory.bkash")}
                        {selectedSale.payment_method === "nagad" && t("salesHistory.nagad")}
                        {!["cash", "card", "bkash", "nagad"].includes(selectedSale.payment_method) && selectedSale.payment_method}
                      </span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    {JSON.parse(selectedSale.items).map((item: any, idx: number) => (
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
                        {formatCurrency(
                          selectedSale.total_amount - selectedSale.tax_amount,
                          i18n.language
                        )}
                      </span>
                    </div>
                    {selectedSale.discount_amount > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>{t("pos.discount")}:</span>
                        <span>-{formatCurrency(selectedSale.discount_amount, i18n.language)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t("pos.tax")}:</span>
                      <span>{formatCurrency(selectedSale.tax_amount, i18n.language)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>{t("common.total")}:</span>
                      <span>{formatCurrency(selectedSale.total_amount, i18n.language)}</span>
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
