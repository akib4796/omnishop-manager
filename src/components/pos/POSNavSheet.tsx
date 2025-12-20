import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { signOut } from "@/integrations/appwrite";
import { LanguageSwitcher } from "../LanguageSwitcher";
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

/**
 * POSNavSheet - Navigation sheet component for POS page
 * Uses the same logic as MobileNavSheet but with POS dark theme styling
 */
export function POSNavSheet() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { profile, isStaff } = useAuth();

    const currentPath = location.pathname;
    const permissions = profile?.role?.permissions || [];

    const menuItems = [
        { title: t("menu.dashboard"), url: "/dashboard", icon: LayoutDashboard, staffAllowed: false, color: "text-blue-400" },
        { title: t("menu.pos"), url: "/pos", icon: ShoppingCart, staffAllowed: true, color: "text-amber-400" },
        { title: t("menu.products"), url: "/products", icon: Package, staffAllowed: true, color: "text-orange-400" },
        { title: t("menu.purchases"), url: "/inventory", icon: ShoppingBag, staffAllowed: true, color: "text-green-400" },
        { title: t("menu.salesHistory"), url: "/sales-history", icon: History, staffAllowed: false, color: "text-cyan-400" },
        { title: t("menu.reports"), url: "/reports", icon: BarChart3, staffAllowed: false, color: "text-indigo-400" },
        { title: t("menu.customers"), url: "/customers", icon: Users, staffAllowed: true, color: "text-purple-400" },
        { title: t("menu.expenses"), url: "/expenses", icon: Receipt, staffAllowed: false, color: "text-pink-400" },
        { title: t("menu.staff"), url: "/staff", icon: UserCog, staffAllowed: false, color: "text-teal-400" },
        { title: t("menu.settings"), url: "/settings", icon: Settings, staffAllowed: false, color: "text-slate-400" },
    ];

    const isActive = (path: string) => currentPath === path;

    // Filter items based on staff label
    const filteredItems = menuItems.filter(item => {
        if (isStaff) {
            return item.staffAllowed;
        }
        // For non-staff (admin/owner), show all items
        if (!profile?.role) return true;
        return permissions.includes(item.url.replace("/", ""));
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
        <Sheet>
            <SheetTrigger asChild>
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors active:scale-95">
                    <Menu className="h-5 w-5" />
                </button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="w-72 p-0 bg-slate-900 border-slate-700 text-white"
            >
                <SheetHeader className="p-4 border-b border-slate-700">
                    <SheetTitle className="text-left text-white">{t("appName")}</SheetTitle>
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
                                            : "text-slate-200 hover:bg-slate-800"
                                    )}
                                >
                                    <item.icon className={cn("h-5 w-5", item.color)} />
                                    <span>{item.title}</span>
                                </Link>
                            </SheetClose>
                        ))}

                        <div className="border-t border-slate-700 my-3" />

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 w-full text-left text-red-400"
                        >
                            <LogOut className="h-5 w-5" />
                            <span>{t("auth.logout")}</span>
                        </button>
                    </div>
                </nav>

                <div className="border-t border-slate-700 p-4">
                    <LanguageSwitcher />
                </div>
            </SheetContent>
        </Sheet>
    );
}
