// Re-export everything from Appwrite integration
export * from './client';
export * from './auth';

// Export types (excluding Product and Category which are in products.ts and categories.ts)
export type { Profile, Tenant, UserRole } from './types';

// Export products and categories modules (these have the correct Product and Category types)
export * from './categories';
export * from './products';

// Export sales and customers modules
export * from './sales';
export * from './customers';

// Export dashboard and expenses modules
export * from './dashboard';
export * from './expenses';
export * from './salesHistory';

// Export inventory and staff modules
export * from './inventory';
export * from './staff';


