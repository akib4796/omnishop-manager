// Products CRUD operations for Appwrite
import { databases, ID, Query } from './client';
import { Category } from './categories';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'omnishop_db';
const COLLECTION_ID = 'products';

export interface Product {
    $id: string;
    name: string;
    sku: string;
    barcode?: string;
    categoryId?: string;
    purchasePrice?: number;
    sellingPrice?: number;
    currentStock: number;
    lowStockThreshold?: number;
    unit?: string;
    imageUrl?: string;
    hasExpiry?: boolean;
    expiryDate?: string;
    tenantId: string;
    $createdAt?: string;
    $updatedAt?: string;
    // Joined data from queries
    category?: Category;
}

export interface CreateProductData {
    name: string;
    sku: string;
    barcode?: string;
    categoryId?: string;
    purchasePrice?: number;
    sellingPrice?: number;
    currentStock: number;
    lowStockThreshold?: number;
    unit?: string;
    imageUrl?: string;
    hasExpiry?: boolean;
    expiryDate?: string;
    tenantId: string;
}

export interface ProductFilters {
    categoryId?: string;
    searchQuery?: string;
    lowStockOnly?: boolean;
}

/**
 * Get all products for a tenant with optional filters
 */
export const getProducts = async (
    tenantId: string,
    filters?: ProductFilters
): Promise<Product[]> => {
    try {
        const queries = [
            Query.equal('tenantId', tenantId),
            Query.orderAsc('name'),
            Query.limit(500)
        ];

        if (filters?.categoryId && filters.categoryId !== 'all') {
            queries.push(Query.equal('categoryId', filters.categoryId));
        }

        if (filters?.lowStockOnly) {
            // This requires a specific query approach
            // We'll filter client-side for now
        }

        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            queries
        );

        let products = response.documents as unknown as Product[];

        // Client-side filtering for search
        if (filters?.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.sku?.toLowerCase().includes(query) ||
                p.barcode?.toLowerCase().includes(query)
            );
        }

        // Client-side filtering for low stock
        if (filters?.lowStockOnly) {
            products = products.filter(p => p.currentStock <= p.lowStockThreshold);
        }

        return products;
    } catch (error: any) {
        console.error('Error fetching products:', error);
        throw error;
    }
};

/**
 * Get all products (for admin use)
 */
export const getAllProducts = async (): Promise<Product[]> => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.orderAsc('name'),
                Query.limit(500)
            ]
        );
        return response.documents as unknown as Product[];
    } catch (error: any) {
        console.error('Error fetching all products:', error);
        throw error;
    }
};

/**
 * Get a single product by ID
 */
export const getProductById = async (productId: string): Promise<Product> => {
    try {
        const response = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID,
            productId
        );
        return response as unknown as Product;
    } catch (error: any) {
        console.error('Error fetching product:', error);
        throw error;
    }
};

/**
 * Get a product by barcode (for POS scanning)
 */
export const getProductByBarcode = async (
    barcode: string,
    tenantId: string
): Promise<Product | null> => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.equal('barcode', barcode),
                Query.equal('tenantId', tenantId),
                Query.limit(1)
            ]
        );

        if (response.documents.length === 0) {
            return null;
        }

        return response.documents[0] as unknown as Product;
    } catch (error: any) {
        console.error('Error fetching product by barcode:', error);
        throw error;
    }
};

/**
 * Get a product by SKU
 */
export const getProductBySku = async (
    sku: string,
    tenantId: string
): Promise<Product | null> => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.equal('sku', sku),
                Query.equal('tenantId', tenantId),
                Query.limit(1)
            ]
        );

        if (response.documents.length === 0) {
            return null;
        }

        return response.documents[0] as unknown as Product;
    } catch (error: any) {
        console.error('Error fetching product by SKU:', error);
        throw error;
    }
};

/**
 * Create a new product
 */
export const createProduct = async (data: CreateProductData): Promise<Product> => {
    try {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            {
                name: data.name,
                sku: data.sku,
                barcode: data.barcode || null,
                categoryId: data.categoryId || null,
                purchasePrice: data.purchasePrice || 0,
                sellingPrice: data.sellingPrice || 0,
                currentStock: data.currentStock,
                lowStockThreshold: data.lowStockThreshold || 10,
                unit: data.unit || 'pcs',
                imageUrl: data.imageUrl || null,
                hasExpiry: data.hasExpiry || false,
                expiryDate: data.expiryDate || null,
                tenantId: data.tenantId,
            }
        );
        return response as unknown as Product;
    } catch (error: any) {
        console.error('Error creating product:', error);
        throw error;
    }
};

/**
 * Update an existing product
 */
export const updateProduct = async (
    productId: string,
    data: Partial<CreateProductData>
): Promise<Product> => {
    try {
        const updateData: Record<string, any> = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.sku !== undefined) updateData.sku = data.sku;
        if (data.barcode !== undefined) updateData.barcode = data.barcode;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
        if (data.sellingPrice !== undefined) updateData.sellingPrice = data.sellingPrice;
        if (data.currentStock !== undefined) updateData.currentStock = data.currentStock;
        if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;
        if (data.unit !== undefined) updateData.unit = data.unit;
        if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
        if (data.hasExpiry !== undefined) updateData.hasExpiry = data.hasExpiry;
        if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;

        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            productId,
            updateData
        );
        return response as unknown as Product;
    } catch (error: any) {
        console.error('Error updating product:', error);
        throw error;
    }
};

/**
 * Update product stock level
 */
export const updateProductStock = async (
    productId: string,
    newStock: number
): Promise<Product> => {
    try {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            productId,
            { currentStock: newStock }
        );
        return response as unknown as Product;
    } catch (error: any) {
        console.error('Error updating product stock:', error);
        throw error;
    }
};

/**
 * Adjust product stock (add or subtract)
 */
export const adjustProductStock = async (
    productId: string,
    adjustment: number
): Promise<Product> => {
    try {
        // Get current stock
        const product = await getProductById(productId);
        const newStock = Math.max(0, product.currentStock + adjustment);

        return await updateProductStock(productId, newStock);
    } catch (error: any) {
        console.error('Error adjusting product stock:', error);
        throw error;
    }
};

/**
 * Delete a product (permanently remove since no isActive field)
 */
export const deleteProduct = async (productId: string): Promise<void> => {
    try {
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTION_ID,
            productId
        );
    } catch (error: any) {
        console.error('Error deleting product:', error);
        throw error;
    }
};

/**
 * Hard delete a product (permanently remove)
 */
export const hardDeleteProduct = async (productId: string): Promise<void> => {
    try {
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTION_ID,
            productId
        );
    } catch (error: any) {
        console.error('Error hard deleting product:', error);
        throw error;
    }
};

/**
 * Get low stock products for a tenant
 */
export const getLowStockProducts = async (tenantId: string): Promise<Product[]> => {
    try {
        const products = await getProducts(tenantId);
        return products.filter(p => p.currentStock <= p.lowStockThreshold);
    } catch (error: any) {
        console.error('Error fetching low stock products:', error);
        throw error;
    }
};

/**
 * Get product count for a tenant
 */
export const getProductCount = async (tenantId: string): Promise<number> => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.equal('tenantId', tenantId),
                Query.limit(1)
            ]
        );
        return response.total;
    } catch (error: any) {
        console.error('Error fetching product count:', error);
        return 0;
    }
};
