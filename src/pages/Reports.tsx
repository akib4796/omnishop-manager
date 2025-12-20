import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNavSheet } from "@/components/MobileNavSheet";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getPendingSales as getLocalPendingSales } from "@/lib/offline-db";
import { toBengaliNumerals } from "@/lib/i18n-utils";
import { FileDown, TrendingUp, RefreshCw, AlertTriangle, Package, Users, DollarSign, Calendar, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getPendingSales } from "@/integrations/appwrite/sales";
import { getProducts, getLowStockProductsPaginated, getInventorySummary } from "@/integrations/appwrite/products";
import { getCustomers } from "@/integrations/appwrite/customers";
import { getCategories } from "@/integrations/appwrite/categories";
import { getStaffMembers } from "@/integrations/appwrite/staff";
import { getCashSessions, calculateZReport, CashSession } from "@/integrations/appwrite/cash_sessions";
import { getLedgerEntries } from "@/integrations/appwrite/payments";
import { SalesTrendChart, CategoryPieChart, HourlySalesChart, TopProductsTable } from "@/components/reports/ReportCharts";
import { AgingReport } from "@/components/reports/AgingReport";
import { SupplierAgingReport } from "@/components/reports/SupplierAgingReport";
import { getSuppliers } from "@/integrations/appwrite/inventory";

// Helper for date formatting
const formatDate = (dateString: string, language: string) => {
  const date = new Date(dateString);
  if (language === "bn") {
    return new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'short' }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date);
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Reports Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-500">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto text-left mx-auto max-w-lg">
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

function ReportsContent() {
  const { t, i18n } = useTranslation();
  const { profile, isLoading: authLoading } = useAuth();
  const tenantId = profile?.tenantId;

  // Data State
  const [sales, setSales] = useState<any[]>([]); // Synced sales
  const [pendingSales, setPendingSales] = useState<any[]>([]); // Offline sales
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Inventory Stats (from server - efficient for KPIs)
  const [inventorySummary, setInventorySummary] = useState({ totalProducts: 0, totalValue: 0, lowStockCount: 0 });

  // Low Stock Pagination
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [lowStockTotal, setLowStockTotal] = useState(0);
  const [lowStockHasMore, setLowStockHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const LOW_STOCK_PAGE_SIZE = 10;

  // Cash Sessions for Z-Report
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);

  // Filter State
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (tenantId) {
      loadReportsData();
    }
  }, [tenantId]);

  async function loadReportsData() {
    setLoading(true);
    try {
      const [localPending, backendSales, allProducts, allCustomers, allCategories, allStaff, invSummary, lowStockResult, allCashSessions, allLedger, allSuppliers] = await Promise.all([
        getLocalPendingSales(),
        getPendingSales(tenantId!),
        getProducts(tenantId!),
        getCustomers(tenantId!),
        getCategories(tenantId!),
        getStaffMembers(tenantId!),
        getInventorySummary(tenantId!),
        getLowStockProductsPaginated(tenantId!, LOW_STOCK_PAGE_SIZE, 0),
        getCashSessions(tenantId!, 10, 'closed'),
        getLedgerEntries(tenantId!),
        getSuppliers(tenantId!)
      ]);

      setPendingSales(localPending);

      // Filter for actual synced sales for reports
      const synced = backendSales.filter(s => s.synced);
      setSales(synced);

      setProducts(allProducts);
      setCustomers(allCustomers);
      setCategories(allCategories);
      setStaffMembers(allStaff);
      setCashSessions(allCashSessions);
      setLedger(allLedger);
      setSuppliers(allSuppliers);


      // Set inventory summary for KPIs
      setInventorySummary(invSummary);

      // Set paginated low stock products
      setLowStockProducts(lowStockResult.data);
      setLowStockTotal(lowStockResult.total);
      setLowStockHasMore(lowStockResult.hasMore);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Error loading reports");
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreLowStock() {
    if (loadingMore || !lowStockHasMore) return;
    setLoadingMore(true);
    try {
      const result = await getLowStockProductsPaginated(
        tenantId!,
        LOW_STOCK_PAGE_SIZE,
        lowStockProducts.length
      );
      setLowStockProducts(prev => [...prev, ...result.data]);
      setLowStockHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading more low stock:", error);
    } finally {
      setLoadingMore(false);
    }
  }

  // --- Aggregations ---

  const salesByDate = useMemo(() => {
    // Aggregate sales by date
    const grouped: Record<string, number> = {};
    sales.forEach(sale => {
      const date = new Date(sale.createdAt).toLocaleDateString('en-CA'); // YYYY-MM-DD
      grouped[date] = (grouped[date] || 0) + (sale.saleData?.total || 0);
    });

    // Fill in last 7/30 days
    const result = [];
    const days = timeRange === 'week' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString('en-CA');
      result.push({
        name: formatDate(dateKey, i18n.language),
        value: grouped[dateKey] || 0,
        fullDate: dateKey
      });
    }
    return result;
  }, [sales, timeRange, i18n.language]);

  const salesByHour = useMemo(() => {
    const grouped = new Array(24).fill(0);
    sales.forEach(sale => {
      const hour = new Date(sale.createdAt).getHours();
      grouped[hour]++; // Count transactions
    });
    return grouped.map((count, hour) => ({
      hour: `${hour}:00`,
      value: count
    }));
  }, [sales]);

  const salesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    sales.forEach(sale => {
      sale.saleData?.items?.forEach((item: any) => {
        const product = products.find(p => p.$id === item.productId);
        const catId = product?.categoryId || 'unknown';
        const catName = categories.find(c => c.$id === catId)?.name || 'Uncategorized';
        grouped[catName] = (grouped[catName] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sales, products, categories]);

  const topProducts = useMemo(() => {
    const grouped: Record<string, { name: string, quantity: number, revenue: number }> = {};
    sales.forEach(sale => {
      sale.saleData?.items?.forEach((item: any) => {
        const id = item.productId;
        if (!grouped[id]) {
          grouped[id] = {
            name: item.productName || products.find(p => p.$id === id)?.name || 'Unknown',
            quantity: 0,
            revenue: 0
          };
        }
        grouped[id].quantity += item.quantity;
        grouped[id].revenue += (item.price * item.quantity);
      });
    });
    return Object.values(grouped)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [sales, products]);

  // Note: lowStockProducts and inventorySummary are now fetched via paginated API
  // and stored in state (lines 82-86), so no useMemo needed here

  // Staff Performance Aggregation
  const staffPerformance = useMemo(() => {
    const grouped: Record<string, { name: string, totalSales: number, transactions: number }> = {};

    sales.forEach(sale => {
      const cashierId = sale.saleData?.cashierId;
      if (!cashierId) return;

      if (!grouped[cashierId]) {
        const staff = staffMembers.find(s => s.userId === cashierId);
        grouped[cashierId] = {
          name: staff?.fullName || 'Unknown Staff',
          totalSales: 0,
          transactions: 0
        };
      }
      grouped[cashierId].totalSales += (sale.saleData?.total || 0);
      grouped[cashierId].transactions += 1;
    });

    return Object.values(grouped)
      .map(s => ({ ...s, avgOrder: s.transactions > 0 ? s.totalSales / s.transactions : 0 }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [sales, staffMembers]);

  // Customer History Aggregation
  const customerHistory = useMemo(() => {
    const grouped: Record<string, { name: string, phone: string, totalSpent: number, visits: number, lastVisit: string }> = {};

    sales.forEach(sale => {
      const customerId = sale.saleData?.customerId;
      if (!customerId) return;

      if (!grouped[customerId]) {
        const customer = customers.find(c => c.$id === customerId);
        grouped[customerId] = {
          name: customer?.name || 'Unknown Customer',
          phone: customer?.phone || '',
          totalSpent: 0,
          visits: 0,
          lastVisit: ''
        };
      }
      grouped[customerId].totalSpent += (sale.saleData?.total || 0);
      grouped[customerId].visits += 1;

      const saleDate = sale.createdAt || sale.saleData?.completedAt;
      if (saleDate && (!grouped[customerId].lastVisit || saleDate > grouped[customerId].lastVisit)) {
        grouped[customerId].lastVisit = saleDate;
      }
    });

    return Object.values(grouped)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20); // Top 20 customers
  }, [sales, customers]);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.saleData?.total || 0), 0);
  const pendingRevenue = pendingSales.reduce((sum, s) => sum + (s.saleData?.total || 0), 0);

  // Profit Margin Calculation
  const profitMargin = useMemo(() => {
    let totalCost = 0;
    let totalSalesRevenue = 0;
    let itemsWithCost = 0;
    let itemsWithoutCost = 0;

    sales.forEach(sale => {
      sale.saleData?.items?.forEach((item: any) => {
        const revenue = (item.price || 0) * (item.quantity || 0);
        const cost = (item.costPrice || 0) * (item.quantity || 0);

        totalSalesRevenue += revenue;
        totalCost += cost;

        if (item.costPrice && item.costPrice > 0) {
          itemsWithCost++;
        } else {
          itemsWithoutCost++;
        }
      });
    });

    const grossProfit = totalSalesRevenue - totalCost;
    const marginPercent = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

    return {
      totalRevenue: totalSalesRevenue,
      totalCost,
      grossProfit,
      marginPercent,
      itemsWithCost,
      itemsWithoutCost,
      hasData: itemsWithCost > 0
    };
  }, [sales]);

  const formatPrice = (price: number) => {
    const formatted = price.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return i18n.language === "bn" ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
  };

  if (authLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <MobileNavSheet title={t("reports.title")} />

        <header className="hidden md:flex sticky top-0 z-10 h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{t("reports.title")}</h1>
          </div>
          <LanguageSwitcher />
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden">

          {/* Top KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">From {sales.length} transactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(inventorySummary.totalValue)}</div>
                <p className="text-xs text-muted-foreground">{inventorySummary.totalProducts} products in stock</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{inventorySummary.lowStockCount}</div>
                <p className="text-xs text-muted-foreground">Items needing reorder</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Offline/Pending</CardTitle>
                <RefreshCw className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingSales.length}</div>
                <p className="text-xs text-muted-foreground">Transactions waiting to sync</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList className="w-full overflow-x-auto flex justify-start gap-1">
              <TabsTrigger value="sales" className="text-xs md:text-sm">Sales</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs md:text-sm">Inventory</TabsTrigger>
              <TabsTrigger value="operations" className="text-xs md:text-sm">Finance</TabsTrigger>
              <TabsTrigger value="sync" className="text-xs md:text-sm">Sync {pendingSales.length > 0 && `(${pendingSales.length})`}</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4">
              <div className="space-y-4">
                <SalesTrendChart
                  title={`Sales Trend (${timeRange === 'week' ? 'Last 7 Days' : 'Last 30 Days'})`}
                  data={salesByDate}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CategoryPieChart title="Sales by Category" data={salesByCategory} />
                  <HourlySalesChart title="Busy Hours" data={salesByHour} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <TopProductsTable title="Top Selling Products" data={topProducts} />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-orange-500 flex items-center justify-between text-sm md:text-base">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 md:h-5 md:w-5" /> Reorder Needed
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {lowStockProducts.length} of {lowStockTotal} items
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 md:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm text-left">
                      <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800">
                        <tr>
                          <th className="px-3 py-2 md:px-4">Product</th>
                          <th className="px-3 py-2 md:px-4 text-right">Current</th>
                          <th className="px-3 py-2 md:px-4 text-right">Min</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockProducts.map(p => (
                          <tr key={p.$id} className="border-b">
                            <td className="px-3 py-2 md:px-4 font-medium truncate max-w-[120px] md:max-w-none">{p.name}</td>
                            <td className="px-3 py-2 md:px-4 text-right text-red-500 font-bold">{p.currentStock}</td>
                            <td className="px-3 py-2 md:px-4 text-right">{p.lowStockThreshold}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Load More Button */}
                  {lowStockHasMore && (
                    <div className="flex justify-center p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMoreLowStock}
                        disabled={loadingMore}
                        className="text-xs"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-2" />
                            Load More ({lowStockTotal - lowStockProducts.length} remaining)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="operations" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Staff Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-0 md:p-6">
                  {staffPerformance.length === 0 ? (
                    <p className="text-muted-foreground p-4">No sales data available for staff performance.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800">
                          <tr>
                            <th className="px-3 py-2 md:px-4">Staff Name</th>
                            <th className="px-3 py-2 md:px-4 text-right">Transactions</th>
                            <th className="px-3 py-2 md:px-4 text-right">Total Sales</th>
                            <th className="px-3 py-2 md:px-4 text-right">Avg Order</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffPerformance.map((staff, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 md:px-4 font-medium">{staff.name}</td>
                              <td className="px-3 py-2 md:px-4 text-right">{staff.transactions}</td>
                              <td className="px-3 py-2 md:px-4 text-right font-bold text-green-600 dark:text-green-400">{formatPrice(staff.totalSales)}</td>
                              <td className="px-3 py-2 md:px-4 text-right text-muted-foreground">{formatPrice(staff.avgOrder)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>



              {/* Aging Report */}
              <AgingReport ledger={ledger} customers={customers} />

              {/* Supplier Aging Report (Accounts Payable) */}
              <SupplierAgingReport ledger={ledger} suppliers={suppliers} />

              {/* Gross Profit Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Gross Profit Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  {!profitMargin.hasData ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm mb-2">No profit data available yet.</p>
                      <p className="text-xs text-muted-foreground">
                        Cost data will be captured from new sales automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                          <p className="text-lg font-bold">{formatPrice(profitMargin.totalRevenue)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Cost of Goods</p>
                          <p className="text-lg font-bold text-red-500">{formatPrice(profitMargin.totalCost)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Gross Profit</p>
                          <p className="text-lg font-bold text-green-500">{formatPrice(profitMargin.grossProfit)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Margin</p>
                          <p className="text-lg font-bold text-blue-500">{profitMargin.marginPercent.toFixed(1)}%</p>
                        </div>
                      </div>
                      {profitMargin.itemsWithoutCost > 0 && (
                        <p className="text-xs text-amber-500 text-center">
                          ⚠️ {profitMargin.itemsWithoutCost} items without cost data (older sales)
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Purchase History */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Top Customers</CardTitle>
                </CardHeader>
                <CardContent className="p-0 md:p-6">
                  {customerHistory.length === 0 ? (
                    <p className="text-muted-foreground p-4">No customer data available. Sales without a linked customer are not shown.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800">
                          <tr>
                            <th className="px-3 py-2 md:px-4">Customer</th>
                            <th className="px-3 py-2 md:px-4 text-right">Visits</th>
                            <th className="px-3 py-2 md:px-4 text-right">Total Spent</th>
                            <th className="px-3 py-2 md:px-4 text-right hidden md:table-cell">Last Visit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerHistory.map((cust, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 md:px-4">
                                <div className="font-medium">{cust.name}</div>
                                {cust.phone && <div className="text-xs text-muted-foreground">{cust.phone}</div>}
                              </td>
                              <td className="px-3 py-2 md:px-4 text-right">{cust.visits}</td>
                              <td className="px-3 py-2 md:px-4 text-right font-bold text-blue-600 dark:text-blue-400">{formatPrice(cust.totalSpent)}</td>
                              <td className="px-3 py-2 md:px-4 text-right text-muted-foreground hidden md:table-cell">
                                {cust.lastVisit ? new Date(cust.lastVisit).toLocaleDateString() : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Z-Report History (Cash Drawer Sessions) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Z-Report History (Cash Sessions)</CardTitle>
                </CardHeader>
                <CardContent className="p-0 md:p-6">
                  {cashSessions.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground text-sm">No closed cash sessions yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cash sessions will appear here after staff open and close shifts in POS.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800">
                          <tr>
                            <th className="px-3 py-2">Shift</th>
                            <th className="px-3 py-2">Cashier</th>
                            <th className="px-3 py-2 text-right">Expected</th>
                            <th className="px-3 py-2 text-right">Actual</th>
                            <th className="px-3 py-2 text-right">Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashSessions.map(session => {
                            const report = calculateZReport(session);
                            return (
                              <tr key={session.$id} className="border-b">
                                <td className="px-3 py-2">
                                  <div className="text-xs">
                                    {new Date(session.openedAt).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {session.closedAt && ` - ${new Date(session.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                  </div>
                                </td>
                                <td className="px-3 py-2 font-medium">{session.cashierName || 'Staff'}</td>
                                <td className="px-3 py-2 text-right">{formatPrice(report.expectedCash)}</td>
                                <td className="px-3 py-2 text-right">{formatPrice(report.actualCash)}</td>
                                <td className={`px-3 py-2 text-right font-bold ${report.variance === 0 ? 'text-green-500' :
                                  report.variance > 0 ? 'text-blue-500' : 'text-red-500'
                                  }`}>
                                  {report.variance >= 0 ? '+' : ''}{formatPrice(report.variance)}
                                  <span className="block text-xs font-normal">
                                    {report.varianceStatus === 'balanced' ? '✓ Balanced' :
                                      report.varianceStatus === 'over' ? 'Over' : 'Short'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sync" className="space-y-4">
              {/* Simplified Offline Sync View */}
              {pendingSales.length === 0 ? (
                <Card className="bg-green-50/10 border-green-200/20">
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <RefreshCw className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-green-500">All Systems Synced</h3>
                    <p className="text-sm text-muted-foreground">No pending offline transactions.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg bg-warning/10">
                      <div>
                        <p className="font-bold">Pending Transaction</p>
                        <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-warning">{formatPrice(sale.saleData?.total || 0)}</p>
                        <p className="text-xs text-warning">Waiting for sync...</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider >
  );
}

export default function Reports() {
  return (
    <ErrorBoundary>
      <ReportsContent />
    </ErrorBoundary>
  )
}
