/**
 * Sales integration layer for Appwrite
 * Handles pending sales for offline-first POS functionality
 */

import { ID, Query } from 'appwrite';
import { databases } from './client';

const DATABASE_ID = 'omnishop_db';
const COLLECTION_ID = 'pending_sales';

// ============================================================================
// Types
// ============================================================================

export interface SaleItem {
    productId: string;
    quantity: number;
    price: number;
}

export interface SaleData {
    tenantId: string;
    customerId?: string | null;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    notes?: string;
    cashierId: string;
    completedAt: string;
}

export interface PendingSale {
    $id: string;
    tenantId: string;
    saleData: SaleData;
    synced: boolean;
    syncedAt?: string;
    createdAt: string;
}

export interface CreatePendingSaleData {
    tenantId: string;
    saleData: SaleData;
    synced?: boolean;
    syncedAt?: string;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new pending sale
 */
export async function createPendingSale(data: CreatePendingSaleData): Promise<PendingSale> {
    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
            tenantId: data.tenantId,
            saleData: JSON.stringify(data.saleData),
            synced: data.synced ?? false,
            syncedAt: data.syncedAt ?? null,
            createdAt: new Date().toISOString(),
        }
    );

    return {
        $id: response.$id,
        tenantId: response.tenantId,
        saleData: JSON.parse(response.saleData),
        synced: response.synced,
        syncedAt: response.syncedAt,
        createdAt: response.createdAt,
    };
}

/**
 * Get all pending sales for a tenant
 */
export async function getPendingSales(tenantId: string): Promise<PendingSale[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.orderDesc('createdAt'),
        ]
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        tenantId: doc.tenantId,
        saleData: typeof doc.saleData === 'string' ? JSON.parse(doc.saleData) : doc.saleData,
        synced: doc.synced,
        syncedAt: doc.syncedAt,
        createdAt: doc.createdAt,
    }));
}

/**
 * Get unsynced pending sales for a tenant
 */
export async function getUnsyncedSales(tenantId: string): Promise<PendingSale[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.equal('synced', false),
            Query.orderAsc('createdAt'),
        ]
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        tenantId: doc.tenantId,
        saleData: typeof doc.saleData === 'string' ? JSON.parse(doc.saleData) : doc.saleData,
        synced: doc.synced,
        syncedAt: doc.syncedAt,
        createdAt: doc.createdAt,
    }));
}

/**
 * Mark a sale as synced
 */
export async function markSaleAsSynced(saleId: string): Promise<void> {
    await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        saleId,
        {
            synced: true,
            syncedAt: new Date().toISOString(),
        }
    );
}

/**
 * Delete a pending sale
 */
export async function deletePendingSale(saleId: string): Promise<void> {
    await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID,
        saleId
    );
}

/**
 * Get total sales count for a tenant
 */
export async function getSalesCount(tenantId: string): Promise<number> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.limit(1),
        ]
    );

    return response.total;
}

/**
 * Get sales for a date range
 */
export async function getSalesInRange(
    tenantId: string,
    startDate: string,
    endDate: string
): Promise<PendingSale[]> {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
            Query.equal('tenantId', tenantId),
            Query.greaterThanEqual('createdAt', startDate),
            Query.lessThanEqual('createdAt', endDate),
            Query.orderDesc('createdAt'),
        ]
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        tenantId: doc.tenantId,
        saleData: typeof doc.saleData === 'string' ? JSON.parse(doc.saleData) : doc.saleData,
        synced: doc.synced,
        syncedAt: doc.syncedAt,
        createdAt: doc.createdAt,
    }));
}
