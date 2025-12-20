import { Client, Account, Databases, Storage, Query, ID } from 'appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
    throw new Error('Missing Appwrite configuration. Check your .env file.');
}

// Initialize Appwrite client
export const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Verify connection to Appwrite backend
client.ping().then(() => {
    console.log('✅ Appwrite connection successful!');
}).catch((error) => {
    console.error('❌ Appwrite connection failed:', error.message);
    console.error('📋 Make sure to add localhost to Platforms in Appwrite Console');
});

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Database ID
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'omnishop_db';

// Collection IDs
export const COLLECTIONS = {
    TENANTS: 'tenants',
    PROFILES: 'profiles',
    USER_ROLES: 'user_roles',
    CATEGORIES: 'categories',
    PRODUCTS: 'products',
    SUPPLIERS: 'suppliers',
    PURCHASE_ORDERS: 'purchase_orders',
    STOCK_ADJUSTMENTS: 'stock_adjustments',
    CUSTOMERS: 'customers',
    SALES: 'sales',
    PENDING_SALES: 'pending_sales',
    EXPENSES: 'expenses',
} as const;

// Re-export utilities
export { Query, ID };

// Type for collection names
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
