import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PERMISSIONS } from "@/lib/permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profile, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const path = location.pathname;

  // 1. Strict POS Mode
  // If user has "pos_only" permission, they cannot leave /pos
  if (!hasPermission(PERMISSIONS.POS_ONLY) === false && profile?.role?.permissions?.includes(PERMISSIONS.POS_ONLY)) {
    if (!path.startsWith("/pos")) {
      return <Navigate to="/pos" replace />;
    }
  }

  // 2. Route-specific permission checks
  // Map routes to required permissions
  const routePermissions: Record<string, string> = {
    "/reports": PERMISSIONS.VIEW_REPORTS,
    "/settings": PERMISSIONS.MANAGE_SETTINGS,
    "/staff": PERMISSIONS.MANAGE_STAFF,
    "/products": PERMISSIONS.MANAGE_PRODUCTS,
    "/inventory": PERMISSIONS.MANAGE_INVENTORY,
    "/customers": PERMISSIONS.MANAGE_CUSTOMERS,
    "/expenses": PERMISSIONS.MANAGE_EXPENSES,
  };

  // Check if current path requires a permission
  for (const [route, permission] of Object.entries(routePermissions)) {
    if (path.startsWith(route) && !hasPermission(permission)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
