import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Desktop/Tablet Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <main className={cn(
          "flex-1 flex flex-col w-full",
          fullHeight ? "h-screen" : "min-h-screen",
          "pb-16 md:pb-0" // Space for bottom nav on mobile
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
              <SheetContent side="left" className="p-0 w-72">
                <AppSidebar />
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

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
