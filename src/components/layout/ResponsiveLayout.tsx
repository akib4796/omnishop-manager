import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { signOut } from "@/integrations/appwrite";
import { toast } from "sonner";

interface ResponsiveLayoutProps {
  children: ReactNode;
  title: string;
  headerActions?: ReactNode;
  noPadding?: boolean;
  fullHeight?: boolean;
}

export function ResponsiveLayout({
  children,
  title,
  headerActions,
  noPadding = false,
  fullHeight = false
}: ResponsiveLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isStaff } = useAuth();

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
    { title: t("menu.expenses"), url: "/expenses", icon: Receipt, permission: "manage_expenses", staffAllowed: false },
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
    if (!item.permission) return true;
    if (!profile?.role) return true;
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Desktop/Tablet Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <main className={cn(
          "flex-1 flex flex-col w-full",
          fullHeight ? "h-screen" : "min-h-screen"
        )}>
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
            {/* Mobile menu trigger */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="text-left">{t("appName")}</SheetTitle>
                </SheetHeader>

                <nav className="flex-1 overflow-y-auto py-4">
                  <div className="space-y-1 px-2">
                    {filteredItems.map((item) => (
                      <SheetClose asChild key={item.url}>
                        <Link
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive(item.url)
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SheetClose>
                    ))}

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-muted w-full text-left text-destructive"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>{t("auth.logout")}</span>
                    </button>
                  </div>
                </nav>

                <div className="border-t p-4">
                  <LanguageSwitcher />
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop sidebar trigger */}
            <div className="hidden md:block">
              <SidebarTrigger />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-semibold truncate">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              {headerActions}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
            </div>
          </header>

          {/* Main content */}
          <div className={cn(
            "flex-1",
            !noPadding && "p-4 md:p-6",
            fullHeight && "overflow-hidden"
          )}>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

