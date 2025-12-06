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

// For backwards compatibility with Supabase patterns (note: this won't work for database queries)
export { account as supabase } from './client';

