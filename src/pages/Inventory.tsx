import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseOrders } from "@/components/inventory/PurchaseOrders";
import { StockAdjustments } from "@/components/inventory/StockAdjustments";

export default function Inventory() {
  const { t } = useTranslation();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">{t("inventory.title")}</h1>

          <Tabs defaultValue="purchase-orders" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="purchase-orders">
                {t("inventory.purchaseOrders")}
              </TabsTrigger>
              <TabsTrigger value="stock-adjustments">
                {t("inventory.stockAdjustments")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="purchase-orders">
              <PurchaseOrders />
            </TabsContent>
            <TabsContent value="stock-adjustments">
              <StockAdjustments />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
