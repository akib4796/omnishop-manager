import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, toBengaliNumerals } from "@/lib/i18n-utils";
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

export default function Customers() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["customer-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("customer_id, total_amount, created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: profile } = await supabase.auth.getUser();
      const { data: tenant } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", profile.user?.id)
        .single();

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(data)
          .eq("id", editingCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customers")
          .insert({ ...data, tenant_id: tenant?.tenant_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(t(editingCustomer ? "customers.updated" : "customers.added"));
      setIsDialogOpen(false);
      setFormData({ name: "", phone: "", email: "" });
      setEditingCustomer(null);
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(t("customers.deleted"));
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (customerId: string) => {
    if (window.confirm(t("customers.deleteConfirm"))) {
      deleteCustomerMutation.mutate(customerId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomerMutation.mutate(formData);
  };

  const filteredCustomers = customers?.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCustomerStats = (customerId: string) => {
    const customerSales = sales?.filter((s) => s.customer_id === customerId) || [];
    const totalSpent = customerSales.reduce((sum, s) => sum + parseFloat(String(s.total_amount)), 0);
    const lastVisit = customerSales.length > 0 
      ? new Date(customerSales[0].created_at)
      : null;
    return { totalSpent, lastVisit };
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t("customers.title")}</h1>
            <Button onClick={() => {
              setEditingCustomer(null);
              setFormData({ name: "", phone: "", email: "" });
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {t("customers.addCustomer")}
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("customers.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <p>{t("common.loading")}</p>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("customers.phone")}</TableHead>
                    <TableHead>{t("customers.email")}</TableHead>
                    <TableHead>{t("customers.totalSpent")}</TableHead>
                    <TableHead>{t("customers.lastVisit")}</TableHead>
                    <TableHead>{t("common.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const stats = getCustomerStats(customer.id);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone || "-"}</TableCell>
                        <TableCell>{customer.email || "-"}</TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(stats.totalSpent, i18n.language)}
                        </TableCell>
                        <TableCell>
                          {stats.lastVisit
                            ? stats.lastVisit.toLocaleDateString(
                                i18n.language === "bn" ? "bn-BD" : "en-US"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(customer)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(customer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t("customers.noCustomers")}
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? t("customers.editCustomer") : t("customers.addCustomer")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t("common.name")}*</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t("customers.phone")}</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t("customers.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
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
