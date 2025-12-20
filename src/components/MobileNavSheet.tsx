import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { signOut } from "@/integrations/appwrite";
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
    Menu,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileNavSheetProps {
    title: string;
}

export function MobileNavSheet({ title }: MobileNavSheetProps) {
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
        <header className="sticky top-0 z-40 flex md:hidden h-14 items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
            <Sheet>
                <SheetTrigger asChild>
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
            <h1 className="flex-1 text-lg font-semibold">{title}</h1>
        </header>
    );
}
