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
    costPrice?: number; // Purchase price for profit margin calculation
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
    amountPaid?: number;  // Amount paid toward this sale (for credit sales)
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

    // Debug: Log raw amountPaid values from Appwrite
    console.log('[Sales] Raw documents amountPaid values:',
        response.documents.map((d: any) => ({ id: d.$id.substring(0, 8), amountPaid: d.amountPaid }))
    );

    return response.documents.map((doc: any) => ({
        $id: doc.$id,
        tenantId: doc.tenantId,
        saleData: typeof doc.saleData === 'string' ? JSON.parse(doc.saleData) : doc.saleData,
        synced: doc.synced,
        syncedAt: doc.syncedAt,
        createdAt: doc.createdAt,
        amountPaid: doc.amountPaid || 0,  // Include amount paid for FIFO tracking
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
        amountPaid: doc.amountPaid || 0,
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
        amountPaid: doc.amountPaid || 0,
    }));
}

/**
 * Get sales for a specific customer
 * Returns full sale data including items, total, payment method
 */
export async function getCustomerSales(tenantId: string, customerId: string): Promise<PendingSale[]> {
    const allSales = await getPendingSales(tenantId);

    // Filter sales that belong to this customer
    return allSales.filter(sale => sale.saleData.customerId === customerId);
}

/**
 * Update the amount paid for a specific sale
 * Note: Requires 'amountPaid' attribute in pending_sales collection
 */
export async function updateSaleAmountPaid(saleId: string, amountPaid: number): Promise<void> {
    console.log('[Sales] Updating amountPaid for sale:', saleId, 'to:', amountPaid);
    try {
        const result = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            saleId,
            {
                amountPaid: amountPaid,
            }
        );
        console.log('[Sales] Successfully updated amountPaid. Result:', result.amountPaid);
    } catch (error: any) {
        console.error('[Sales] Error updating amountPaid:', error);
        // Gracefully handle missing attribute error
        if (error?.code === 400 && error?.message?.includes('Unknown attribute')) {
            console.warn('[Sales] amountPaid attribute not found in collection. Payment recorded but FIFO tracking requires adding this attribute to Appwrite.');
        } else {
            throw error;
        }
    }
}

/**
 * Get unpaid/partially paid credit sales for a customer, sorted oldest first
 */
export async function getUnpaidCreditSales(tenantId: string, customerId: string): Promise<PendingSale[]> {
    const customerSales = await getCustomerSales(tenantId, customerId);

    // Filter to credit sales that are not fully paid
    return customerSales
        .filter(sale => {
            // Only credit sales
            if (sale.saleData.paymentMethod !== 'credit') return false;

            // Check if not fully paid
            const paid = sale.amountPaid || 0;
            const total = sale.saleData.total;
            return paid < total;
        })
        // Sort by createdAt ascending (oldest first for FIFO)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Allocate a payment to credit sales using FIFO (oldest first)
 * Returns array of updated sales with their new amountPaid values
 */
export async function allocatePaymentToSales(
    tenantId: string,
    customerId: string,
    paymentAmount: number
): Promise<{ saleId: string; amountApplied: number; newAmountPaid: number; isFullyPaid: boolean }[]> {
    const unpaidSales = await getUnpaidCreditSales(tenantId, customerId);

    let remainingPayment = paymentAmount;
    const allocations: { saleId: string; amountApplied: number; newAmountPaid: number; isFullyPaid: boolean }[] = [];

    for (const sale of unpaidSales) {
        if (remainingPayment <= 0) break;

        const currentPaid = sale.amountPaid || 0;
        const total = sale.saleData.total;
        const outstanding = total - currentPaid;

        // How much can we apply to this sale?
        const amountToApply = Math.min(remainingPayment, outstanding);
        const newAmountPaid = currentPaid + amountToApply;

        // Update the sale in database
        await updateSaleAmountPaid(sale.$id, newAmountPaid);

        allocations.push({
            saleId: sale.$id,
            amountApplied: amountToApply,
            newAmountPaid: newAmountPaid,
            isFullyPaid: newAmountPaid >= total,
        });

        remainingPayment -= amountToApply;
    }

    return allocations;
}
