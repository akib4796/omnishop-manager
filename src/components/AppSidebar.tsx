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
  Receipt,
  UserCog,
  Settings,
  LogOut,
  Landmark,
  FileText,
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

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isStaff } = useAuth();

  const collapsed = state === "collapsed";
  const currentPath = location.pathname;
  const permissions = profile?.role?.permissions || [];

  const menuItems = [
    { title: t("menu.dashboard"), url: "/dashboard", icon: LayoutDashboard, permission: "view_dashboard", staffAllowed: false },
    { title: t("menu.pos"), url: "/pos", icon: ShoppingCart, permission: "access_pos", staffAllowed: true },
    { title: t("menu.products"), url: "/products", icon: Package, permission: "manage_products", staffAllowed: true },
    { title: t("menu.purchases"), url: "/inventory", icon: ShoppingBag, permission: "manage_inventory", staffAllowed: true },
    { title: t("menu.salesHistory"), url: "/sales-history", icon: History, permission: "view_sales", staffAllowed: false },
    { title: t("menu.reports"), url: "/reports", icon: BarChart3, permission: "view_reports", staffAllowed: false },
    { title: t("menu.customers"), url: "/customers", icon: Users, permission: "manage_customers", staffAllowed: true },
    { title: t("menu.quotations", "Quotations"), url: "/quotations", icon: FileText, permission: "access_pos", staffAllowed: true },
    { title: "Accounting", url: "/accounting", icon: Landmark, permission: "manage_expenses", staffAllowed: false },
    { title: t("menu.staff"), url: "/staff", icon: UserCog, permission: "manage_staff", staffAllowed: false },
    { title: t("menu.settings"), url: "/settings", icon: Settings, permission: "manage_settings", staffAllowed: false },
  ];

  const isActive = (path: string) => currentPath === path;

  // Filter items based on permissions and staff label
  const filteredItems = menuItems.filter(item => {
    // If user is staff, only show staff-allowed items
    if (isStaff) {
      return item.staffAllowed;
    }
    // Otherwise, check role permissions
    if (!item.permission) return true; // Public items
    if (!profile?.role) return true; // If no role, show all (legacy/owner)
    return permissions.includes(item.permission);
  });

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
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-6">
            {!collapsed && t("appName")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end>
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                  {!collapsed && <span>{t("auth.logout")}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <LanguageSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-4 py-2">
          <SyncIndicator />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
