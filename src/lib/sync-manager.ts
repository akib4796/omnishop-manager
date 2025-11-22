import { supabase } from "@/integrations/supabase/client";
import {
  cacheProducts,
  cacheCategories,
  cacheCustomers,
  getPendingSales,
  markSaleAsSynced,
  updateCachedProductStock,
} from "./offline-db";

export class SyncManager {
  private static instance: SyncManager;
  private syncing = false;
  private syncCallbacks: ((status: 'syncing' | 'success' | 'error', message?: string) => void)[] = [];

  static getInstance() {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  onSyncStatusChange(callback: (status: 'syncing' | 'success' | 'error', message?: string) => void) {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifySync(status: 'syncing' | 'success' | 'error', message?: string) {
    this.syncCallbacks.forEach(cb => cb(status, message));
  }

  async syncAll() {
    if (this.syncing) return;

    try {
      this.syncing = true;
      this.notifySync('syncing');

      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Sync pending sales first
      await this.syncPendingSales();

      // Then sync data from server
      await this.syncFromServer();

      this.notifySync('success');
    } catch (error) {
      console.error("Sync error:", error);
      this.notifySync('error', error instanceof Error ? error.message : 'Sync failed');
    } finally {
      this.syncing = false;
    }
  }

  private async syncPendingSales() {
    const pendingSales = await getPendingSales();
    if (pendingSales.length === 0) return;

    const results = await Promise.allSettled(
      pendingSales.map(async (sale) => {
        // Insert sale to pending_sales table
        const { error } = await supabase
          .from('pending_sales')
          .insert({
            id: sale.id,
            tenant_id: sale.tenant_id,
            sale_data: sale.sale_data,
            created_at: sale.created_at,
            synced: true,
            synced_at: new Date().toISOString(),
          });

        if (error) throw error;

        // Update product stock on server
        const items = sale.sale_data.items || [];
        for (const item of items) {
          const { data: product } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({ current_stock: product.current_stock - item.quantity })
              .eq('id', item.product_id);
          }
        }

        await markSaleAsSynced(sale.id);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    if (successful > 0) {
      this.notifySync('success', `${successful} sales synced`);
    }
  }

  private async syncFromServer() {
    // Sync products
    const { data: products } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          color
        )
      `);

    if (products) {
      await cacheProducts(products);
    }

    // Sync categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*');

    if (categories) {
      await cacheCategories(categories);
    }

    // Sync customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*');

    if (customers) {
      await cacheCustomers(customers);
    }
  }

  async decrementStockLocally(productId: string, quantity: number) {
    const { data: product } = await supabase
      .from('products')
      .select('current_stock')
      .eq('id', productId)
      .single();

    if (product) {
      const newStock = product.current_stock - quantity;
      await updateCachedProductStock(productId, newStock);
    }
  }
}

export const syncManager = SyncManager.getInstance();
