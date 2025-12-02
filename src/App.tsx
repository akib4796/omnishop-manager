import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import POS from "./pages/POS";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import SalesHistory from "./pages/SalesHistory";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import Staff from "./pages/Staff";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><><Dashboard /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><><Products /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><><Inventory /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute><><POS /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/sales-history" element={<ProtectedRoute><><SalesHistory /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><><Customers /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><><Expenses /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute><><Staff /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><><Reports /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><><Settings /><MobileBottomNav /></></ProtectedRoute>} />
          <Route path="/install" element={<Install />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
