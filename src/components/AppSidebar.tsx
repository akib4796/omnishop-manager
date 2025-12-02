import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  const menuItems = [
    { title: t("menu.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("menu.pos"), url: "/pos", icon: ShoppingCart },
    { title: t("menu.products"), url: "/products", icon: Package },
    { title: t("menu.purchases"), url: "/inventory", icon: ShoppingBag },
    { title: t("menu.salesHistory"), url: "/sales-history", icon: History },
    { title: t("menu.reports"), url: "/reports", icon: BarChart3 },
    { title: t("menu.customers"), url: "/customers", icon: Users },
    { title: t("menu.expenses"), url: "/expenses", icon: Receipt },
    { title: t("menu.staff"), url: "/staff", icon: UserCog },
    { title: t("menu.settings"), url: "/settings", icon: Settings },
  ];

  const isActive = (path: string) => currentPath === path;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
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
              {menuItems.map((item) => (
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
