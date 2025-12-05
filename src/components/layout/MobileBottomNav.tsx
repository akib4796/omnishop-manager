import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  History, 
  BarChart3 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, labelKey: "menu.dashboard" },
  { path: "/pos", icon: ShoppingCart, labelKey: "menu.pos" },
  { path: "/products", icon: Package, labelKey: "menu.products" },
  { path: "/sales-history", icon: History, labelKey: "menu.salesHistory" },
  { path: "/reports", icon: BarChart3, labelKey: "menu.reports" },
];

export function MobileBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[64px] px-2 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
              <span className={cn(
                "text-[10px] font-medium truncate max-w-full",
                isActive && "text-primary"
              )}>
                {t(item.labelKey)}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
