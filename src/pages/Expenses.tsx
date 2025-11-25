import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Download, Trash2 } from "lucide-react";
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

export default function Expenses() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    note: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, profiles(full_name)")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userData.user.id)
        .single();

      if (profileError || !profile?.tenant_id) throw new Error("No tenant found");

      const { error } = await supabase.from("expenses").insert({
        category: data.category,
        amount: parseFloat(data.amount),
        date: data.date,
        note: data.note || null,
        tenant_id: profile.tenant_id,
        created_by: userData.user.id,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(t("expenses.deleted"));
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpenseMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  const handleDelete = (expenseId: string) => {
    if (window.confirm(t("expenses.deleteConfirm"))) {
      deleteExpenseMutation.mutate(expenseId);
    }
  };

  const handleExportCSV = () => {
    if (!expenses || expenses.length === 0) return;

    const headers = ["Date", "Category", "Amount", "Note", "Created By"];
    const rows = expenses.map((e) => [
      format(new Date(e.date), "yyyy-MM-dd"),
      e.category,
      e.amount,
      e.note || "",
      e.profiles?.full_name || "N/A",
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
    (sum, e) => sum + parseFloat(String(e.amount)),
    0
  ) || 0;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t("expenses.title")}</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                {t("common.export")}
              </Button>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("expenses.addExpense")}
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t("expenses.monthlyTotal")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatCurrency(monthlyTotal, i18n.language)}
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <p>{t("common.loading")}</p>
          ) : expenses && expenses.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("expenses.category")}</TableHead>
                    <TableHead>{t("expenses.amount")}</TableHead>
                    <TableHead>{t("expenses.note")}</TableHead>
                    <TableHead>{t("expenses.createdBy")}</TableHead>
                    <TableHead>{t("common.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
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
                      <TableCell>{expense.profiles?.full_name || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
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
