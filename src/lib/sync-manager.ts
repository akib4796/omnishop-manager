/**
 * Sync Manager for Offline-First POS
 * Handles synchronization between local IndexedDB and Appwrite cloud
 */

import { account } from "@/integrations/appwrite";
import { getProducts, updateProductStock } from "@/integrations/appwrite/products";
import { getCategories } from "@/integrations/appwrite/categories";
import { getCustomers } from "@/integrations/appwrite/customers";
import {
  createPendingSale as createCloudSale,
  markSaleAsSynced as markCloudSaleAsSynced,
} from "@/integrations/appwrite/sales";
import {
  cacheProducts,
  cacheCategories,
  cacheCustomers,
  getPendingSales,
  markSaleAsSynced,
  updateCachedProductStock,
} from "./offline-db";

// Helper to get current user's tenant ID
async function getCurrentTenantId(): Promise<string | null> {
  try {
    const user = await account.get();
    if (!user) return null;

    // Import databases dynamically to avoid circular dependencies
    const { databases } = await import("@/integrations/appwrite/client");
    const { Query } = await import("appwrite");

    const DATABASE_ID = 'omnishop_db';
    const response = await databases.listDocuments(
      DATABASE_ID,
      'profiles',
      [Query.equal('userId', user.$id), Query.limit(1)]
    );

    if (response.documents.length > 0) {
      return response.documents[0].tenantId;
    }
    return null;
  } catch (error) {
    console.error('Error getting tenant ID:', error);
    return null;
  }
}

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

      // Get current user
      const user = await account.get();
      if (!user) throw new Error("Not authenticated");

      const tenantId = await getCurrentTenantId();
      if (!tenantId) throw new Error("No tenant found");

      // Sync pending sales first
      await this.syncPendingSales(tenantId);

      // Then sync data from server
      await this.syncFromServer(tenantId);

      this.notifySync('success');
    } catch (error) {
      console.error("Sync error:", error);
      this.notifySync('error', error instanceof Error ? error.message : 'Sync failed');
    } finally {
      this.syncing = false;
    }
  }

  private async syncPendingSales(tenantId: string) {
    const pendingSales = await getPendingSales();
    if (pendingSales.length === 0) return;

    const results = await Promise.allSettled(
      pendingSales.map(async (sale) => {
        // Upload sale to Appwrite
        await createCloudSale({
          tenantId: sale.tenant_id,
          saleData: sale.sale_data,
          synced: true,
          syncedAt: new Date().toISOString(),
          amountPaid: sale.amountPaid, // Added
        });

        // Update product stock on server
        const items = sale.sale_data.items || [];
        for (const item of items) {
          try {
            // Get current stock from server
            const { getProductById } = await import("@/integrations/appwrite/products");
            const product = await getProductById(item.product_id);

            if (product) {
              const newStock = (product.currentStock || 0) - item.quantity;
              await updateProductStock(item.product_id, newStock);
            }
          } catch (err) {
            console.error(`Failed to update stock for product ${item.product_id}:`, err);
          }
        }

        // Mark local sale as synced
        await markSaleAsSynced(sale.id);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    if (successful > 0) {
      this.notifySync('success', `${successful} sales synced`);
    }
  }

  private async syncFromServer(tenantId: string) {
    try {
      // Sync products (use the camelCase version, then convert for cache)
      const products = await getProducts(tenantId);
      if (products && products.length > 0) {
        // Convert camelCase to snake_case for offline cache compatibility
        const productsForCache = products.map(p => ({
          id: p.$id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          category_id: p.categoryId,
          current_stock: p.currentStock,
          selling_price: p.sellingPrice,
          purchase_price: p.purchasePrice,
          low_stock_threshold: p.lowStockThreshold,
          unit: p.unit,
          image_url: p.imageUrl,
          tenant_id: p.tenantId,
          has_expiry: p.hasExpiry,
          expiry_date: p.expiryDate,
        }));
        await cacheProducts(productsForCache);
      }

      // Sync categories
      const categories = await getCategories(tenantId);
      if (categories && categories.length > 0) {
        const categoriesForCache = categories.map(c => ({
          id: c.$id,
          name: c.name,
          color: c.color,
          tenant_id: c.tenantId,
          is_active: c.isActive,
        }));
        await cacheCategories(categoriesForCache);
      }

      // Sync customers
      const customers = await getCustomers(tenantId);
      if (customers && customers.length > 0) {
        const customersForCache = customers.map(c => ({
          id: c.$id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          tenant_id: c.tenantId,
        }));
        await cacheCustomers(customersForCache);
      }
    } catch (error) {
      console.error("Error syncing from server:", error);
      throw error;
    }
  }

  async decrementStockLocally(productId: string, quantity: number) {
    try {
      const { getProductById } = await import("@/integrations/appwrite/products");
      const product = await getProductById(productId);

      if (product) {
        const newStock = (product.currentStock || 0) - quantity;
        await updateCachedProductStock(productId, newStock);
      }
    } catch (error) {
      console.error("Error decrementing stock locally:", error);
    }
  }
}

export const syncManager = SyncManager.getInstance();
