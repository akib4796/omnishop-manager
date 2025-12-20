import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileNavSheet } from "@/components/MobileNavSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Download, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  getExpenses,
  createExpense,
  deleteExpense,
  Expense,
} from "@/integrations/appwrite/expenses";

export default function Expenses() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, isLoading: authLoading, user } = useAuth();
  const tenantId = profile?.tenantId;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    note: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getExpenses(tenantId);
    },
    enabled: !!tenantId,
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { category: string; amount: string; note: string; date: string }) => {
      if (!tenantId || !user) throw new Error("Not authenticated");

      return createExpense({
        category: data.category,
        amount: parseFloat(data.amount),
        date: data.date,
        note: data.note || undefined,
        tenantId,
        createdBy: user.$id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", tenantId] });
      toast.success(t("expenses.expenseAdded"));
      setIsDialogOpen(false);
      setFormData({
        category: "",
        amount: "",
        note: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onError: (error: Error) => {
      console.error("Expense add error:", error);
      toast.error(t("common.error") + ": " + error.message);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      return deleteExpense(expenseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", tenantId] });
      toast.success(t("expenses.deleted"));
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpenseMutation.mutate(formData);
  };

  const handleDelete = (expenseId: string) => {
    if (window.confirm(t("expenses.deleteConfirm"))) {
      deleteExpenseMutation.mutate(expenseId);
    }
  };

  const handleExportCSV = () => {
    if (!expenses || expenses.length === 0) return;

    const headers = ["Date", "Category", "Amount", "Note"];
    const rows = expenses.map((e) => [
      format(new Date(e.date), "yyyy-MM-dd"),
      e.category,
      e.amount,
      e.note || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString()}.csv`;
    a.click();
  };

  const monthlyTotal = expenses?.reduce(
    (sum, e) => sum + e.amount,
    0
  ) || 0;

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
        <MobileNavSheet title={t("expenses.title")} />

        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="hidden md:block text-xl md:text-3xl font-bold">{t("expenses.title")}</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t("common.export")}</span>
              </Button>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t("expenses.addExpense")}</span>
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t("expenses.monthlyTotal")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl md:text-3xl font-bold">
                {formatCurrency(monthlyTotal, i18n.language)}
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : expenses && expenses.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("expenses.category")}</TableHead>
                    <TableHead>{t("expenses.amount")}</TableHead>
                    <TableHead>{t("expenses.note")}</TableHead>
                    <TableHead>{t("common.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense: Expense) => (
                    <TableRow key={expense.$id}>
                      <TableCell>
                        {i18n.language === "bn"
                          ? toBengaliNumerals(format(new Date(expense.date), "dd/MM/yyyy"))
                          : format(new Date(expense.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(expense.amount, i18n.language)}
                      </TableCell>
                      <TableCell>{expense.note || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.$id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t("expenses.noExpenses")}
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("expenses.addExpense")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="date">{t("common.date")}*</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">{t("expenses.category")}*</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">{t("expenses.amount")}*</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="note">{t("expenses.note")}</Label>
                    <Textarea
                      id="note"
                      value={formData.note}
                      onChange={(e) =>
                        setFormData({ ...formData, note: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit">{t("common.save")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
