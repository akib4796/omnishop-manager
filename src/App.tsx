import { Toaster } from "@/components/ui/toaster";
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SysAdminProtectedRoute } from "./components/SysAdminProtectedRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { POSLayout } from "@/components/layout/POSLayout";
import Index from "./pages/Index";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Setup = lazy(() => import("./pages/Setup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Inventory = lazy(() => import("./pages/Inventory"));
const POS = lazy(() => import("./pages/POS"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SalesHistory = lazy(() => import("./pages/SalesHistory"));
const Customers = lazy(() => import("./pages/Customers"));
// const Expenses = lazy(() => import("./pages/Expenses")); // Superceded by Accounting
const Accounting = lazy(() => import("./pages/Accounting"));
const Staff = lazy(() => import("./pages/Staff"));
const Quotations = lazy(() => import("./pages/Quotations"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));

// SysAdmin Pages
const SysAdminLogin = lazy(() => import("./pages/sysadmin/Login"));
const SysAdminDashboard = lazy(() => import("./pages/sysadmin/Dashboard"));
const SysAdminTenants = lazy(() => import("./pages/sysadmin/Tenants"));
const SysAdminActivity = lazy(() => import("./pages/sysadmin/Activity"));
const SysAdminUsers = lazy(() => import("./pages/sysadmin/Users"));
const SysAdminAnalytics = lazy(() => import("./pages/sysadmin/Analytics"));
const SysAdminSettings = lazy(() => import("./pages/sysadmin/Settings"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />

            {/* POS Layout Route */}
            <Route element={<POSLayout />}>
              <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
            </Route>

            <Route path="/sales-history" element={<ProtectedRoute><SalesHistory /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            {/* <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} /> */}
            <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
            <Route path="/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/install" element={<Install />} />

            {/* SysAdmin Routes */}
            <Route path="/sysadmin/login" element={<SysAdminLogin />} />
            <Route path="/sysadmin/dashboard" element={<SysAdminProtectedRoute><SysAdminDashboard /></SysAdminProtectedRoute>} />
            <Route path="/sysadmin/tenants" element={<SysAdminProtectedRoute><SysAdminTenants /></SysAdminProtectedRoute>} />
            <Route path="/sysadmin/activity" element={<SysAdminProtectedRoute><SysAdminActivity /></SysAdminProtectedRoute>} />
            <Route path="/sysadmin/users" element={<SysAdminProtectedRoute><SysAdminUsers /></SysAdminProtectedRoute>} />
            <Route path="/sysadmin/analytics" element={<SysAdminProtectedRoute><SysAdminAnalytics /></SysAdminProtectedRoute>} />
            <Route path="/sysadmin/settings" element={<SysAdminProtectedRoute><SysAdminSettings /></SysAdminProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider >
);

export default App;
