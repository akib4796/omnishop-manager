import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileNavSheet } from "@/components/MobileNavSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/i18n-utils";
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
import { useAuth } from "@/hooks/useAuth";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  Customer
} from "@/integrations/appwrite/customers";
import { getCustomerSalesStats } from "@/integrations/appwrite/sales";
import { CustomerDetailsModal } from "@/components/customers/CustomerDetailsModal";

export default function Customers() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, isLoading: authLoading, user } = useAuth();
  const tenantId = profile?.tenantId;

  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", priceTier: "retail", creditLimit: "0" });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getCustomers(tenantId);
    },
    enabled: !!tenantId,
  });

  // Note: For customer sales stats, we would need a sales collection query
  // For now, we'll disable the stats feature or return defaults

  const saveCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; email: string; priceTier: string; creditLimit: string }) => {
      if (!tenantId || !user) throw new Error("Not authenticated");

      if (editingCustomer) {
        return updateCustomer(editingCustomer.$id, {
          name: data.name,
          phone: data.phone || undefined,
          email: data.email || undefined,
          priceTier: data.priceTier as 'retail' | 'wholesale' | 'dealer',
          creditLimit: parseFloat(data.creditLimit || "0"),
        });
      } else {
        return createCustomer({
          name: data.name,
          phone: data.phone || undefined,
          email: data.email || undefined,
          priceTier: data.priceTier as 'retail' | 'wholesale' | 'dealer',
          creditLimit: parseFloat(data.creditLimit || "0"),
          tenantId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
      toast.success(t(editingCustomer ? "customers.customerUpdated" : "customers.customerAdded"));
      setIsDialogOpen(false);
      setFormData({ name: "", phone: "", email: "", priceTier: "retail", creditLimit: "0" });
      setEditingCustomer(null);
    },
    onError: (error: Error) => {
      console.error("Customer save error:", error);
      toast.error(t("common.error") + ": " + error.message);
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return deleteCustomer(customerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
      toast.success(t("customers.deleted"));
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      priceTier: customer.priceTier || "retail",
      creditLimit: (customer.creditLimit || 0).toString(),
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

  // Query for all customer stats
  const { data: customerStatsMap } = useQuery({
    queryKey: ["customerStats", tenantId, customers?.map(c => c.$id).join(',')],
    queryFn: async () => {
      if (!tenantId || !customers || customers.length === 0) return {};
      const statsMap: Record<string, { totalSpent: number; lastVisit: Date | null; salesCount: number }> = {};
      // Fetch stats for each customer
      await Promise.all(
        customers.map(async (customer) => {
          const stats = await getCustomerSalesStats(tenantId, customer.$id);
          statsMap[customer.$id] = stats;
        })
      );
      return statsMap;
    },
    enabled: !!tenantId && !!customers && customers.length > 0,
  });

  // Get stats for a customer
  const getCustomerStats = (customerId: string) => {
    return customerStatsMap?.[customerId] || { totalSpent: 0, lastVisit: null, salesCount: 0 };
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
        <MobileNavSheet title={t("customers.title")} />

        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="hidden md:block text-xl md:text-3xl font-bold">{t("customers.title")}</h1>
            <Button onClick={() => {
              setEditingCustomer(null);
              setFormData({ name: "", phone: "", email: "", priceTier: "retail", creditLimit: "0" });
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
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredCustomers.map((customer) => {
                  const stats = getCustomerStats(customer.$id);
                  return (
                    <div
                      key={customer.$id}
                      className="bg-card border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{customer.name}</h3>
                          <p className="text-sm text-muted-foreground">{customer.phone || "-"}</p>
                        </div>
                        <div className="flex gap-1">
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
                            onClick={() => handleDelete(customer.$id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t("customers.totalSpent")}:</span>
                          <p className="font-bold">{formatCurrency(stats.totalSpent, i18n.language)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("customers.lastVisit")}:</span>
                          <p>{stats.lastVisit
                            ? stats.lastVisit.toLocaleDateString(
                              i18n.language === "bn" ? "bn-BD" : "en-US"
                            )
                            : "-"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block border rounded-lg overflow-x-auto">
                <Table className="min-w-[700px]">
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
                      const stats = getCustomerStats(customer.$id);
                      return (
                        <TableRow
                          key={customer.$id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsDetailsOpen(true);
                          }}
                        >
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
                                onClick={() => handleDelete(customer.$id)}
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
            </>
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
                  <div>
                    <Label htmlFor="priceTier">{t("customers.priceTier") || "Price Tier"}</Label>
                    <Select
                      value={formData.priceTier}
                      onValueChange={(value) => setFormData({ ...formData, priceTier: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="dealer">Dealer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="creditLimit">{t("customers.creditLimit") || "Credit Limit"}</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      min="0"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
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

          {/* Customer Details Modal */}
          <CustomerDetailsModal
            open={isDetailsOpen}
            onOpenChange={setIsDetailsOpen}
            customer={selectedCustomer}
            tenantId={tenantId || ""}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
