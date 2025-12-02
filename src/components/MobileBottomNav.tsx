import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  BarChart3,
} from "lucide-react";

export function MobileBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { title: t("menu.dashboard"), url: "/dashboard", icon: LayoutDashboard, label: "ড্যাশবোর্ড" },
    { title: t("menu.pos"), url: "/pos", icon: ShoppingCart, label: "POS" },
    { title: t("menu.products"), url: "/products", icon: Package, label: "পণ্য" },
    { title: t("menu.salesHistory"), url: "/sales-history", icon: History, label: "বিক্রয়" },
    { title: t("menu.reports"), url: "/reports", icon: BarChart3, label: "রিপোর্ট" },
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar-background border-t border-sidebar-border">
      <nav className="flex items-center justify-around h-16 px-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              isActive(item.url)
                ? "text-sidebar-primary bg-sidebar-accent"
                : "text-sidebar-foreground/70"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
