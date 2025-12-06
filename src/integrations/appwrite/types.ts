// Appwrite Document Types
export interface AppwriteDocument {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
    $collectionId: string;
    $databaseId: string;
}

// Core Collections
export interface Tenant extends AppwriteDocument {
    businessName: string;
    businessType?: string;
    currency?: string;
    taxRate?: number;
    address?: string;
    logoUrl?: string;
    defaultLanguage?: string;
    // SysAdmin fields
    status?: 'active' | 'suspended' | 'inactive';
    subscriptionPlan?: 'free' | 'basic' | 'premium';
    maxUsers?: number;
    createdBySysadmin?: string;
    featuresEnabled?: string;
}

export interface Profile extends AppwriteDocument {
    user_id: string;
    tenant_id: string;
    full_name?: string;
    email?: string;
    phone?: string;
}

export interface UserRole extends AppwriteDocument {
    user_id: string;
    tenant_id: string;
    role: 'admin' | 'manager' | 'staff';
}

export interface Category extends AppwriteDocument {
    tenant_id: string;
    name: string;
    color?: string;
}

export interface Product extends AppwriteDocument {
    tenant_id: string;
    category_id?: string;
    name: string;
    sku?: string;
    barcode?: string;
    purchase_price?: number;
    selling_price: number;
    current_stock?: number;
    low_stock_threshold?: number;
    unit?: string;
    image_url?: string;
    has_expiry?: boolean;
    expiry_date?: string;
}

export interface Supplier extends AppwriteDocument {
    tenant_id: string;
    name: string;
    phone?: string;
    email?: string;
}

export interface PurchaseOrder extends AppwriteDocument {
    tenant_id: string;
    supplier_id?: string;
    status: 'pending' | 'received' | 'cancelled';
    total_amount?: number;
    items?: string; // JSON string
    received_at?: string;
}

export interface StockAdjustment extends AppwriteDocument {
    tenant_id: string;
    product_id: string;
    qty_change: number;
    reason: string;
    adjusted_by?: string;
}

export interface Customer extends AppwriteDocument {
    tenant_id: string;
    name: string;
    phone?: string;
    email?: string;
}

export interface Sale extends AppwriteDocument {
    tenant_id: string;
    customer_id?: string;
    cashier_id?: string;
    items: string; // JSON string
    payment_method: 'cash' | 'card' | 'mobile' | 'credit';
    total_amount: number;
    discount_amount?: number;
    tax_amount?: number;
    notes?: string;
    synced_from_offline?: boolean;
}

export interface PendingSale extends AppwriteDocument {
    tenant_id: string;
    sale_data: string; // JSON string
    synced?: boolean;
    synced_at?: string;
}

export interface Expense extends AppwriteDocument {
    tenant_id: string;
    category: string;
    amount: number;
    date: string;
    created_by?: string;
    note?: string;
}

// Helper type for creating documents (without Appwrite metadata)
export type CreateDocument<T extends AppwriteDocument> = Omit<T, keyof AppwriteDocument>;
