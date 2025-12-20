import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "@/integrations/appwrite";
import { SyncIndicator } from "./SyncIndicator";
import { LanguageSwitcher } from "./LanguageSwitcher";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ShoppingBag,
  History,
  BarChart3,
  Users,
  UserCog,
  Settings,
  LogOut,
  Landmark,
  FileText,
  Truck,
  ClipboardList,
  Wallet,
  CreditCard,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";

// Menu item type
interface MenuItem {
  title: string;
  url: string;
  icon: any;
  permission?: string;
  staffAllowed: boolean;
}

// Menu group type
interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isStaff } = useAuth();

  const collapsed = state === "collapsed";
  const currentPath = location.pathname;
  const permissions = profile?.role?.permissions || [];

  // Grouped menu structure matching the design
  const menuGroups: MenuGroup[] = [
    {
      label: "DASHBOARD",
      items: [
        { title: t("menu.dashboard"), url: "/dashboard", icon: LayoutDashboard, permission: "view_dashboard", staffAllowed: false },
      ],
    },
    {
      label: "SALES",
      items: [
        { title: t("menu.pos"), url: "/pos", icon: ShoppingCart, permission: "access_pos", staffAllowed: true },
        { title: t("menu.salesHistory"), url: "/sales-history", icon: History, permission: "view_sales", staffAllowed: false },
        { title: t("menu.customers"), url: "/customers", icon: Users, permission: "manage_customers", staffAllowed: true },
        { title: t("menu.quotations", "Quotations"), url: "/quotations", icon: FileText, permission: "access_pos", staffAllowed: true },
      ],
    },
    {
      label: "PURCHASING",
      items: [
        { title: t("menu.purchases"), url: "/inventory", icon: ShoppingBag, permission: "manage_inventory", staffAllowed: true },
      ],
    },
    {
      label: "INVENTORY",
      items: [
        { title: t("menu.products"), url: "/products", icon: Package, permission: "manage_products", staffAllowed: true },
      ],
    },
    {
      label: "FINANCE",
      items: [
        { title: "Accounting", url: "/accounting", icon: Landmark, permission: "manage_expenses", staffAllowed: false },
        { title: t("menu.reports"), url: "/reports", icon: BarChart3, permission: "view_reports", staffAllowed: false },
      ],
    },
    {
      label: "SETTINGS",
      items: [
        { title: t("menu.staff"), url: "/staff", icon: UserCog, permission: "manage_staff", staffAllowed: false },
        { title: t("menu.settings"), url: "/settings", icon: Settings, permission: "manage_settings", staffAllowed: false },
      ],
    },
  ];

  const isActive = (path: string) => currentPath === path;

  // Filter items based on permissions and staff label
  const filterItem = (item: MenuItem): boolean => {
    if (isStaff) {
      return item.staffAllowed;
    }
    if (!item.permission) return true;
    if (!profile?.role) return true;
    return permissions.includes(item.permission);
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(t("auth.errorLoggingOut"));
    } else {
      navigate("/login");
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent className="gap-1 p-2">
        {/* App Name Header */}
        <div className="px-3 py-2">
          {!collapsed && (
            <span className="text-lg font-bold text-primary">BechaKenaPro</span>
          )}
        </div>

        {/* Menu Groups with Box Style */}
        {menuGroups.map((group) => {
          const filteredItems = group.items.filter(filterItem);
          if (filteredItems.length === 0) return null;

          return (
            <div
              key={group.label}
              className={`rounded-lg border bg-card ${!collapsed ? 'p-2' : 'p-1'} mb-1`}
            >
              {!collapsed && (
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  {group.label}
                </div>
              )}
              <SidebarMenu className="gap-0.5">
                {filteredItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className="h-8 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                    >
                      <NavLink to={item.url} end>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          );
        })}

        {/* Logout */}
        <div className="rounded-lg border bg-card p-1 mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} className="h-8 text-sm text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>{t("auth.logout")}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className="flex items-center justify-between gap-2">
          <LanguageSwitcher />
          <SyncIndicator />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
