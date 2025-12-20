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
    UserCog,
    Settings,
    LogOut,
    Menu,
    FileText,
    Landmark,
} from "lucide-react";
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

// Menu item type
interface MenuItem {
    title: string;
    url: string;
    icon: any;
    staffAllowed: boolean;
}

// Menu group type
interface MenuGroup {
    label: string;
    items: MenuItem[];
}

/**
 * POSNavSheet - Navigation sheet component for POS page
 * Uses grouped box-style layout matching the main sidebar
 */
export function POSNavSheet() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { profile, isStaff } = useAuth();

    const currentPath = location.pathname;
    const permissions = profile?.role?.permissions || [];

    // Grouped menu structure matching the sidebar
    const menuGroups: MenuGroup[] = [
        {
            label: "DASHBOARD",
            items: [
                { title: t("menu.dashboard"), url: "/dashboard", icon: LayoutDashboard, staffAllowed: false },
            ],
        },
        {
            label: "SALES",
            items: [
                { title: t("menu.pos"), url: "/pos", icon: ShoppingCart, staffAllowed: true },
                { title: t("menu.salesHistory"), url: "/sales-history", icon: History, staffAllowed: false },
                { title: t("menu.customers"), url: "/customers", icon: Users, staffAllowed: true },
                { title: t("menu.quotations", "Quotations"), url: "/quotations", icon: FileText, staffAllowed: true },
            ],
        },
        {
            label: "PURCHASING",
            items: [
                { title: t("menu.purchases"), url: "/inventory", icon: ShoppingBag, staffAllowed: true },
            ],
        },
        {
            label: "INVENTORY",
            items: [
                { title: t("menu.products"), url: "/products", icon: Package, staffAllowed: true },
            ],
        },
        {
            label: "FINANCE",
            items: [
                { title: "Accounting", url: "/accounting", icon: Landmark, staffAllowed: false },
                { title: t("menu.reports"), url: "/reports", icon: BarChart3, staffAllowed: false },
            ],
        },
        {
            label: "SETTINGS",
            items: [
                { title: t("menu.staff"), url: "/staff", icon: UserCog, staffAllowed: false },
                { title: t("menu.settings"), url: "/settings", icon: Settings, staffAllowed: false },
            ],
        },
    ];

    const isActive = (path: string) => currentPath === path;

    // Filter items based on staff label
    const filterItem = (item: MenuItem): boolean => {
        if (isStaff) {
            return item.staffAllowed;
        }
        if (!profile?.role) return true;
        return true; // Show all for non-staff
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
        <Sheet>
            <SheetTrigger asChild>
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors active:scale-95">
                    <Menu className="h-5 w-5" />
                </button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="w-64 p-0 bg-slate-900 border-slate-700 text-white flex flex-col h-full"
            >
                <SheetHeader className="px-3 py-2 border-b border-slate-700 shrink-0">
                    <SheetTitle className="text-left text-primary font-bold text-base">BechaKenaPro</SheetTitle>
                </SheetHeader>

                <nav className="flex-1 py-1 px-1.5 space-y-1 overflow-hidden">
                    {/* Menu Groups with Compact Box Style */}
                    {menuGroups.map((group) => {
                        const filteredItems = group.items.filter(filterItem);
                        if (filteredItems.length === 0) return null;

                        return (
                            <div
                                key={group.label}
                                className="rounded-md border border-slate-700 bg-slate-800/50 p-1"
                            >
                                <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider px-1.5 py-0.5">
                                    {group.label}
                                </div>
                                <div>
                                    {filteredItems.map((item) => (
                                        <SheetClose asChild key={item.url}>
                                            <Link
                                                to={item.url}
                                                className={cn(
                                                    "flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors",
                                                    isActive(item.url)
                                                        ? "bg-primary text-primary-foreground"
                                                        : "text-slate-200 hover:bg-slate-700 hover:text-white"
                                                )}
                                            >
                                                <item.icon className="h-3.5 w-3.5" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SheetClose>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Logout */}
                    <div className="rounded-md border border-slate-700 bg-slate-800/50 p-1">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors hover:bg-red-900/30 w-full text-left text-red-400 hover:text-red-300"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            <span>{t("auth.logout")}</span>
                        </button>
                    </div>
                </nav>

                <div className="border-t border-slate-700 p-2 shrink-0">
                    <LanguageSwitcher />
                </div>
            </SheetContent>
        </Sheet>
    );
}
