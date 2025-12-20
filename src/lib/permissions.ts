/**
 * Centralized Permission Constants
 * 
 * Use these constants instead of hardcoded strings to prevent typos
 * and enable IDE autocompletion.
 * 
 * Example: PERMISSIONS.VIEW_REPORTS instead of "view_reports"
 */

export const PERMISSIONS = {
    // Dashboard & Overview
    VIEW_DASHBOARD: 'view_dashboard',

    // POS Access
    ACCESS_POS: 'access_pos',
    POS_ONLY: 'pos_only', // Special: Locks user to POS screen only

    // Products & Inventory
    MANAGE_PRODUCTS: 'manage_products',
    MANAGE_INVENTORY: 'manage_inventory',

    // Sales & Customers
    VIEW_SALES: 'view_sales',
    MANAGE_CUSTOMERS: 'manage_customers',

    // Reports & Analytics
    VIEW_REPORTS: 'view_reports',

    // Expenses
    MANAGE_EXPENSES: 'manage_expenses',

    // Staff & Settings (Admin)
    MANAGE_STAFF: 'manage_staff',
    MANAGE_SETTINGS: 'manage_settings',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Default permission sets for common roles
 * These can be used as templates when creating roles in the database
 */
export const ROLE_TEMPLATES = {
    OWNER: Object.values(PERMISSIONS).filter(p => p !== PERMISSIONS.POS_ONLY),

    MANAGER: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.ACCESS_POS,
        PERMISSIONS.MANAGE_PRODUCTS,
        PERMISSIONS.MANAGE_INVENTORY,
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.MANAGE_CUSTOMERS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.MANAGE_EXPENSES,
    ],

    CASHIER: [
        PERMISSIONS.ACCESS_POS,
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.MANAGE_CUSTOMERS,
    ],

    CASHIER_RESTRICTED: [
        PERMISSIONS.ACCESS_POS,
        PERMISSIONS.POS_ONLY, // Cannot leave POS screen
    ],
};
