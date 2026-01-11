import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  products: {
    key: string;
    value: any;
  };
  categories: {
    key: string;
    value: any;
  };
  customers: {
    key: string;
    value: any;
  };
  pendingSales: {
    key: string;
    value: {
      id: string;
      tenant_id: string;
      sale_data: any;
      created_at: string;
      synced: boolean;
      amountPaid?: number; // Added
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      updated_at: string;
    };
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;
export async function initOfflineDB() {
  if (db) return db;

  db = await openDB<OfflineDB>('omnimanager-offline', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingSales')) {
        db.createObjectStore('pendingSales', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return db;
}

// Products
export async function cacheProducts(products: any[]) {
  const database = await initOfflineDB();
  const tx = database.transaction('products', 'readwrite');
  await Promise.all(products.map(p => tx.store.put(p)));
  await updateMetadata('products_last_sync', new Date().toISOString());
}

export async function getCachedProducts() {
  const database = await initOfflineDB();
  return database.getAll('products');
}

export async function updateCachedProductStock(productId: string, newStock: number) {
  const database = await initOfflineDB();
  const product = await database.get('products', productId);
  if (product) {
    product.current_stock = newStock;
    await database.put('products', product);
  }
}

// Categories
export async function cacheCategories(categories: any[]) {
  const database = await initOfflineDB();
  const tx = database.transaction('categories', 'readwrite');
  await Promise.all(categories.map(c => tx.store.put(c)));
  await updateMetadata('categories_last_sync', new Date().toISOString());
}

export async function getCachedCategories() {
  const database = await initOfflineDB();
  return database.getAll('categories');
}

// Customers
export async function cacheCustomers(customers: any[]) {
  const database = await initOfflineDB();
  const tx = database.transaction('customers', 'readwrite');
  await Promise.all(customers.map(c => tx.store.put(c)));
  await updateMetadata('customers_last_sync', new Date().toISOString());
}

export async function getCachedCustomers() {
  const database = await initOfflineDB();
  return database.getAll('customers');
}

// Pending Sales
export async function savePendingSale(sale: {
  id: string;
  tenant_id: string;
  sale_data: any;
  created_at: string;
  amountPaid?: number; // Added
}) {
  const database = await initOfflineDB();
  await database.put('pendingSales', {
    ...sale,
    synced: false,
  });
}

export async function getPendingSales() {
  const database = await initOfflineDB();
  const allSales = await database.getAll('pendingSales');
  return allSales.filter(s => !s.synced);
}

export async function markSaleAsSynced(saleId: string) {
  const database = await initOfflineDB();
  const sale = await database.get('pendingSales', saleId);
  if (sale) {
    sale.synced = true;
    await database.put('pendingSales', sale);
  }
}

export async function deletePendingSale(saleId: string) {
  const database = await initOfflineDB();
  await database.delete('pendingSales', saleId);
}

// Metadata
export async function updateMetadata(key: string, value: any) {
  const database = await initOfflineDB();
  await database.put('metadata', {
    key,
    value,
    updated_at: new Date().toISOString(),
  });
}

export async function getMetadata(key: string) {
  const database = await initOfflineDB();
  const record = await database.get('metadata', key);
  return record?.value;
}

export async function getLastSyncTime() {
  const productsSync = await getMetadata('products_last_sync');
  return productsSync ? new Date(productsSync) : null;
}
